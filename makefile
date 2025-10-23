TS_NODE := yarn ts-node

client_info:
	$(TS_NODE) src/get_client_info.ts

transactions_year:
	$(TS_NODE) src/get_transactions_all_accounts.ts

split_months:
	$(TS_NODE) src/split_transactions_by_month.ts

update_all:
	$(TS_NODE) src/get_client_info.ts
	$(TS_NODE) src/get_transactions_all_accounts.ts
	$(TS_NODE) src/split_transactions_by_month.ts
