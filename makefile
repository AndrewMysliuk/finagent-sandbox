TS_NODE := yarn ts-node

client_info:
	$(TS_NODE) src/data_get_client_info.ts

transactions_year:
	$(TS_NODE) src/data_get_transactions_all_accounts.ts

split_months:
	$(TS_NODE) src/data_split_transactions_by_month.ts

run_finagent_core:
	$(TS_NODE) src/finagent_core.ts

run_fop_taxes_counter:
	$(TS_NODE) src/fop_taxes_counter.ts
