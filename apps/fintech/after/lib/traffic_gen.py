import asyncio
import random

from opentelemetry import trace

from lib.logger import logger
from lib.store import (
    get_accounts, record_transaction, initiate_transfer, complete_transfer, fail_transfer,
    request_loan, approve_loan, decline_loan
)
from lib.metrics import (
    account_created, transactions_list, transfer_initiated, transfer_completed, transfer_failed,
    loan_requested, loan_approved, loan_declined, accounts_list
)

tracer = trace.get_tracer("hello-otel-fintech.traffic_gen")

is_running = False

async def simulate_transaction():
    try:
        accounts_list_data = get_accounts()
        if not accounts_list_data:
            return
        
        account = random.choice(accounts_list_data)
        transaction_type = random.choice(["deposit", "withdrawal"])
        amount = round(random.uniform(50, 500), 2)
        
        transaction = record_transaction(account["id"], transaction_type, amount)
        transactions_list.add(1)
        logger.info("transaction.recorded", {
            "account_id": account["id"],
            "type": transaction_type,
            "amount": amount,
            "transaction_id": transaction["id"]
        })
    except Exception as e:
        logger.error("traffic_gen_error", {"error": str(e)})

async def simulate_transfer():
    try:
        accounts_list_data = get_accounts()
        if len(accounts_list_data) < 2:
            return
        
        from_acc, to_acc = random.sample(accounts_list_data, 2)
        amount = round(random.uniform(100, 1000), 2)
        
        transfer_initiated.add(1)
        logger.info("transfer.initiated", {
            "from_account": from_acc["id"],
            "to_account": to_acc["id"],
            "amount": amount
        })
        
        await asyncio.sleep(0.1)
        
        # Simulate success/failure
        if random.random() < 0.05:
            fail_transfer(from_acc["id"], to_acc["id"], amount)
            transfer_failed.add(1)
            logger.warn("transfer.failed", {
                "from_account": from_acc["id"],
                "to_account": to_acc["id"],
                "amount": amount,
                "reason": "insufficient_funds"
            })
        else:
            transfer = complete_transfer(from_acc["id"], to_acc["id"], amount)
            transfer_completed.add(1)
            logger.info("transfer.completed", {
                "from_account": from_acc["id"],
                "to_account": to_acc["id"],
                "amount": amount,
                "transfer_id": transfer["id"]
            })
    except Exception as e:
        logger.error("traffic_gen_error", {"error": str(e)})

async def simulate_loan():
    try:
        accounts_list_data = get_accounts()
        if not accounts_list_data:
            return
        
        account = random.choice(accounts_list_data)
        amount = round(random.uniform(5000, 50000), 2)
        term_months = random.choice([12, 24, 36, 60])
        
        loan = request_loan(account["id"], amount, term_months)
        loan_requested.add(1)
        logger.info("loan.requested", {
            "account_id": account["id"],
            "amount": amount,
            "term_months": term_months
        })
        
        await asyncio.sleep(0.15)
        
        # Simulate approval/decline
        if random.random() < 0.15:
            decline_loan(loan["id"])
            loan_declined.add(1)
            logger.info("loan.declined", {
                "account_id": account["id"],
                "amount": amount,
                "loan_id": loan["id"],
                "reason": "credit_score_insufficient"
            })
        else:
            approve_loan(loan["id"])
            loan_approved.add(1)
            logger.info("loan.approved", {
                "account_id": account["id"],
                "amount": amount,
                "loan_id": loan["id"]
            })
    except Exception as e:
        logger.error("traffic_gen_error", {"error": str(e)})

async def simulate_accounts_list():
    try:
        accounts_list_data = get_accounts()
        accounts_list.add(1)
        logger.info("accounts.list", {"count": len(accounts_list_data), "source": "traffic_gen"})
    except Exception as e:
        logger.error("traffic_gen_error", {"error": str(e)})

async def start_traffic_generator():
    global is_running
    if is_running:
        return
    is_running = True
    
    print("[traffic-gen] Starting mock fintech traffic generator")
    
    while True:
        try:
            await asyncio.sleep(3 + random.random() * 4)
            action = random.random()
            if action < 0.4:
                with tracer.start_as_current_span("fintech.simulate.transaction"):
                    await simulate_transaction()
            elif action < 0.7:
                with tracer.start_as_current_span("fintech.simulate.transfer"):
                    await simulate_transfer()
            elif action < 0.9:
                with tracer.start_as_current_span("fintech.simulate.accounts_list"):
                    await simulate_accounts_list()
            else:
                with tracer.start_as_current_span("fintech.simulate.loan"):
                    await simulate_loan()
        except Exception as e:
            logger.error("traffic_gen_error", {"error": str(e)})
