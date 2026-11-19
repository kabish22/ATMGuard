
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="ATMGuard API",
    description="ATM Fault Tolerance and Transaction Recovery System",
    version="1.0.0"
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class FaultRequest(BaseModel):
    atm_code: str
    fault_type: str
    description: str


class ATMStatusUpdate(BaseModel):
    status: str


# ==========================================
# REQUEST MODEL
# ==========================================

class WithdrawalRequest(BaseModel):
    transaction_id: str
    atm_code: str
    amount: Decimal = Field(gt=0)
    dispense_success: bool = True


# ==========================================
# HOME API
# ==========================================

@app.get("/")
def home():
    return {
        "message": "Welcome to ATMGuard",
        "status": "Running"
    }


# ==========================================
# HEALTH CHECK API
# ==========================================

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "Healthy",
            "database": "Connected"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# GET ALL ATMS
# ==========================================

@app.get("/atms")
def get_all_atms(db: Session = Depends(get_db)):

    result = db.execute(
        text("SELECT * FROM atms ORDER BY id")
    )

    atms = []

    for row in result.mappings():
        atms.append({
            "id": row["id"],
            "atm_code": row["atm_code"],
            "location": row["location"],
            "status": row["status"],
            "network_status": row["network_status"],
            "cash_balance": float(row["cash_balance"]),
            "created_at": (
                row["created_at"].isoformat()
                if row["created_at"] else None
            )
        })

    return {
        "total_atms": len(atms),
        "atms": atms
    }


# ==========================================
# MANUALLY UPDATE ATM STATUS (ADMIN CONTROL)
# ==========================================

@app.post("/atms/{atm_id}/status")
def update_atm_status(
    atm_id: int,
    request: ATMStatusUpdate,
    db: Session = Depends(get_db)
):
    new_status = request.status.strip().upper()

    if new_status not in ["ONLINE", "OFFLINE"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be ONLINE or OFFLINE"
        )

    try:
        with db.begin():
            atm = db.execute(
                text("""
                    SELECT id, atm_code, status, network_status
                    FROM atms
                    WHERE id = :atm_id
                    FOR UPDATE
                """),
                {"atm_id": atm_id}
            ).mappings().first()

            if not atm:
                raise HTTPException(status_code=404, detail="ATM not found")

            new_network_status = (
                "CONNECTED" if new_status == "ONLINE" else "DISCONNECTED"
            )

            db.execute(
                text("""
                    UPDATE atms
                    SET status = :status,
                        network_status = :network_status
                    WHERE id = :atm_id
                """),
                {
                    "status": new_status,
                    "network_status": new_network_status,
                    "atm_id": atm_id
                }
            )

            db.execute(
                text("""
                    INSERT INTO electronic_journal
                    (transaction_id, event_type, details)
                    VALUES (NULL, 'ATM_STATUS_CHANGED', :details)
                """),
                {
                    "details": (
                        f"Admin manually changed {atm['atm_code']} status "
                        f"from {atm['status']} to {new_status}; "
                        f"network set to {new_network_status}."
                    )
                }
            )

        return {
            "message": f"{atm['atm_code']} status updated successfully",
            "atm_id": atm_id,
            "atm_code": atm["atm_code"],
            "status": new_status,
            "network_status": new_network_status
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ATM WITHDRAWAL API
# ==========================================

@app.post("/transactions/withdraw")
def withdraw_money(
    request: WithdrawalRequest,
    db: Session = Depends(get_db)
):

    try:
        with db.begin():

            existing = db.execute(
                text("""
                    SELECT transaction_id, atm_id, amount, status
                    FROM transactions
                    WHERE transaction_id = :txn_id
                """),
                {"txn_id": request.transaction_id}
            ).mappings().first()

            if existing:
                if (
                    existing["atm_id"] is None
                    or existing["amount"] != request.amount
                ):
                    raise HTTPException(
                        status_code=409,
                        detail="Transaction ID already used with different details"
                    )

                return {
                    "message": "Duplicate request detected",
                    "duplicate": True,
                    "transaction_id": existing["transaction_id"],
                    "status": existing["status"]
                }

            atm = db.execute(
                text("""
                    SELECT id, status, network_status, cash_balance
                    FROM atms
                    WHERE atm_code = :atm_code
                    FOR UPDATE
                """),
                {"atm_code": request.atm_code}
            ).mappings().first()

            if not atm:
                raise HTTPException(
                    status_code=404,
                    detail="ATM not found"
                )

            if atm["status"] != "ONLINE":
                raise HTTPException(
                    status_code=400,
                    detail="ATM is offline or under maintenance"
                )

            if atm["network_status"] != "CONNECTED":
                raise HTTPException(
                    status_code=400,
                    detail="ATM network is disconnected"
                )

            if atm["cash_balance"] < request.amount:
                raise HTTPException(
                    status_code=400,
                    detail="Insufficient ATM cash"
                )

            db.execute(
                text("""
                    INSERT INTO transactions
                    (transaction_id, atm_id, amount, status)
                    VALUES (:txn_id, :atm_id, :amount, 'HELD')
                """),
                {
                    "txn_id": request.transaction_id,
                    "atm_id": atm["id"],
                    "amount": request.amount
                }
            )

            if request.dispense_success:

                db.execute(
                    text("""
                        UPDATE atms
                        SET cash_balance = cash_balance - :amount
                        WHERE id = :atm_id
                    """),
                    {
                        "amount": request.amount,
                        "atm_id": atm["id"]
                    }
                )

                db.execute(
                    text("""
                        UPDATE transactions
                        SET status = 'COMMITTED'
                        WHERE transaction_id = :txn_id
                    """),
                    {"txn_id": request.transaction_id}
                )

                final_status = "COMMITTED"
                event_details = (
                    "Withdrawal successful. ATM cash balance updated."
                )

            
            else:
                db.execute(
                    text("""
                        UPDATE transactions
                        SET status = 'FAILED'
                        WHERE transaction_id = :txn_id
                    """),
                    {"txn_id": request.transaction_id}
                )

                final_status = "FAILED"
                event_details = (
                    "Cash dispensing failed. ATM cash balance unchanged."
                )

                # Automatic recovery log
                db.execute(
                    text("""
                        INSERT INTO recovery_logs
                        (transaction_id, recovery_action, result)
                        VALUES (
                            :txn_id,
                            'AUTO_VERIFY_NO_DEBIT',
                            'RECONCILED_NO_DEBIT'
                        )
                    """),
                    {"txn_id": request.transaction_id}
                )

                # Record recovery event
                db.execute(
                    text("""
                        INSERT INTO electronic_journal
                        (transaction_id, event_type, details)
                        VALUES (
                            :txn_id,
                            'RECOVERY',
                            'Automatic recovery completed. No ATM cash was deducted.'
                        )
                    """),
                    {"txn_id": request.transaction_id}
                )

            db.execute(
                text("""
                    INSERT INTO electronic_journal
                    (transaction_id, event_type, details)
                    VALUES (:txn_id, :event_type, :details)
                """),
                {
                    "txn_id": request.transaction_id,
                    "event_type": final_status,
                    "details": event_details
                }
            )


        return {
            "message": "Transaction processed",
            "transaction_id": request.transaction_id,
            "atm_code": request.atm_code,
            "amount": float(request.amount),
            "status": final_status,
            "duplicate": False
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# GET TRANSACTION HISTORY
# ==========================================

@app.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):

    result = db.execute(
        text("""
            SELECT
                t.id,
                t.transaction_id,
                a.atm_code,
                t.amount,
                t.status,
                t.created_at
            FROM transactions t
            LEFT JOIN atms a ON t.atm_id = a.id
            ORDER BY t.id DESC
        """)
    )

    return [dict(row) for row in result.mappings()]


# ==========================================
# TRANSACTION RECOVERY API
# ==========================================

@app.post("/transactions/{transaction_id}/recover")
def recover_transaction(
    transaction_id: str,
    db: Session = Depends(get_db)
):

    try:
        with db.begin():

            txn = db.execute(
                text("""
                    SELECT transaction_id, atm_id, amount, status
                    FROM transactions
                    WHERE transaction_id = :txn_id
                    FOR UPDATE
                """),
                {"txn_id": transaction_id}
            ).mappings().first()

            if not txn:
                raise HTTPException(
                    status_code=404,
                    detail="Transaction not found"
                )

            existing = db.execute(
                text("""
                    SELECT id, recovery_action, result
                    FROM recovery_logs
                    WHERE transaction_id = :txn_id
                    LIMIT 1
                """),
                {"txn_id": transaction_id}
            ).mappings().first()

            if existing:
                return {
                    "message": "Recovery already recorded",
                    "transaction_id": transaction_id,
                    "result": existing["result"],
                    "duplicate": True
                }

            if txn["status"] != "FAILED":
                raise HTTPException(
                    status_code=409,
                    detail="Only FAILED transactions can be reconciled"
                )

            db.execute(
                text("""
                    INSERT INTO recovery_logs
                    (transaction_id, recovery_action, result)
                    VALUES (
                        :txn_id,
                        'VERIFY_NO_DEBIT',
                        'RECONCILED_NO_DEBIT'
                    )
                """),
                {"txn_id": transaction_id}
            )

            db.execute(
                text("""
                    INSERT INTO electronic_journal
                    (transaction_id, event_type, details)
                    VALUES (
                        :txn_id,
                        'RECOVERY',
                        'Failed withdrawal reconciled. No ATM cash was deducted.'
                    )
                """),
                {"txn_id": transaction_id}
            )

        return {
            "message": "Recovery completed",
            "transaction_id": transaction_id,
            "original_status": "FAILED",
            "recovery_result": "RECONCILED_NO_DEBIT",
            "duplicate": False
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# GET RECOVERY LOGS
# ==========================================

@app.get("/recovery/logs")
def get_recovery_logs(db: Session = Depends(get_db)):

    result = db.execute(
        text("""
            SELECT *
            FROM recovery_logs
            ORDER BY id DESC
        """)
    )

    return [dict(row) for row in result.mappings()]


# ==========================================
# GET FAULT LOGS
# ==========================================

@app.get("/faults")
def get_fault_logs(db: Session = Depends(get_db)):

    result = db.execute(
        text("""
            SELECT *
            FROM fault_logs
            ORDER BY id DESC
        """)
    )

    return [dict(row) for row in result.mappings()]


# ==========================================
# GET ELECTRONIC JOURNAL
# ==========================================

@app.get("/journal")
def get_electronic_journal(db: Session = Depends(get_db)):

    result = db.execute(
        text("""
            SELECT *
            FROM electronic_journal
            ORDER BY id DESC
        """)
    )

    return [dict(row) for row in result.mappings()]

# ==========================================
# SIMULATE ATM FAULT
# ==========================================

@app.post("/faults/simulate")
def simulate_fault(
    request: FaultRequest,
    db: Session = Depends(get_db)
):
    allowed_faults = [
        "NETWORK_FAILURE",
        "POWER_FAILURE",
        "DISPENSER_FAILURE"
    ]

    if request.fault_type not in allowed_faults:
        raise HTTPException(
            status_code=400,
            detail="Invalid fault type"
        )

    try:
        with db.begin():
            atm = db.execute(
                text("""
                    SELECT id, status, network_status
                    FROM atms
                    WHERE atm_code = :code
                    FOR UPDATE
                """),
                {"code": request.atm_code}
            ).mappings().first()

            if not atm:
                raise HTTPException(
                    status_code=404,
                    detail="ATM not found"
                )

            db.execute(
                text("""
                    INSERT INTO fault_logs
                    (atm_id, fault_type, description, status)
                    VALUES (:atm_id, :fault_type, :description, 'ACTIVE')
                """),
                {
                    "atm_id": atm["id"],
                    "fault_type": request.fault_type,
                    "description": request.description
                }
            )

            if request.fault_type == "NETWORK_FAILURE":
                db.execute(
                    text("""
                        UPDATE atms
                        SET network_status = 'DISCONNECTED'
                        WHERE id = :atm_id
                    """),
                    {"atm_id": atm["id"]}
                )

            elif request.fault_type == "POWER_FAILURE":
                db.execute(
                    text("""
                        UPDATE atms
                        SET status = 'OFFLINE'
                        WHERE id = :atm_id
                    """),
                    {"atm_id": atm["id"]}
                )

            db.execute(
                text("""
                    INSERT INTO electronic_journal
                    (transaction_id, event_type, details)
                    VALUES (:txn_id, 'FAULT', :details)
                """),
                {
                    "txn_id": None,
                    "details": (
                        request.fault_type + ": " + request.description
                    )
                }
            )

        return {
            "message": "Fault simulated successfully",
            "atm_code": request.atm_code,
            "fault_type": request.fault_type,
            "status": "ACTIVE"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# RESOLVE ATM FAULT
# ==========================================

@app.post("/faults/{fault_id}/resolve")
def resolve_fault(
    fault_id: int,
    db: Session = Depends(get_db)
):
    try:
        with db.begin():
            fault = db.execute(
                text("""
                    SELECT id, atm_id, fault_type, status
                    FROM fault_logs
                    WHERE id = :fault_id
                    FOR UPDATE
                """),
                {"fault_id": fault_id}
            ).mappings().first()

            if not fault:
                raise HTTPException(
                    status_code=404,
                    detail="Fault not found"
                )

            if fault["status"] == "RESOLVED":
                raise HTTPException(
                    status_code=409,
                    detail="Fault is already resolved"
                )

            # Mark this fault as resolved first.
            db.execute(
                text("""
                    UPDATE fault_logs
                    SET status = 'RESOLVED'
                    WHERE id = :fault_id
                """),
                {"fault_id": fault_id}
            )

            # Check whether any active faults of each type remain.
            remaining_network_faults = db.execute(
                text("""
                    SELECT COUNT(*)
                    FROM fault_logs
                    WHERE atm_id = :atm_id
                      AND fault_type = 'NETWORK_FAILURE'
                      AND status = 'ACTIVE'
                """),
                {"atm_id": fault["atm_id"]}
            ).scalar() or 0

            remaining_power_faults = db.execute(
                text("""
                    SELECT COUNT(*)
                    FROM fault_logs
                    WHERE atm_id = :atm_id
                      AND fault_type = 'POWER_FAILURE'
                      AND status = 'ACTIVE'
                """),
                {"atm_id": fault["atm_id"]}
            ).scalar() or 0

            # Restore network and power independently. This works even when
            # the network and power faults are resolved in either order.
            update_values = {"atm_id": fault["atm_id"]}
            update_parts = []

            if fault["fault_type"] == "NETWORK_FAILURE":
                update_parts.append("network_status = :network_status")
                update_values["network_status"] = (
                    "DISCONNECTED" if remaining_network_faults > 0 else "CONNECTED"
                )

            if fault["fault_type"] == "POWER_FAILURE":
                update_parts.append("status = :atm_status")
                update_values["atm_status"] = (
                    "OFFLINE" if remaining_power_faults > 0 else "ONLINE"
                )

            if update_parts:
                db.execute(
                    text(
                        "UPDATE atms SET "
                        + ", ".join(update_parts)
                        + " WHERE id = :atm_id"
                    ),
                    update_values
                )

            # Record the resolution in the electronic journal.
            db.execute(
                text("""
                    INSERT INTO electronic_journal
                    (transaction_id, event_type, details)
                    VALUES (
                        :txn_id,
                        'FAULT_RESOLVED',
                        :details
                    )
                """),
                {
                    "txn_id": None,
                    "details": "Fault " + str(fault_id) + " resolved"
                }
            )

        return {
            "message": "Fault resolved successfully",
            "fault_id": fault_id,
            "fault_type": fault["fault_type"],
            "status": "RESOLVED"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
