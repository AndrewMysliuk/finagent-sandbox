TS_NODE := yarn ts-node

client_info:
	$(TS_NODE) src/integrations/monobank/get_client_info.ts

transactions_year:
	$(TS_NODE) src/integrations/monobank/get_transactions_all_accounts.ts

split_months:
	$(TS_NODE) src/integrations/monobank/split_transactions_by_month.ts

run_finagent_core:
	$(TS_NODE) src/finagent/core.ts

run_fop_taxes_group_1_counter:
	$(TS_NODE) src/taxes_counter/fop_taxes_group_1_counter.ts

run_fop_taxes_group_2_counter:
	$(TS_NODE) src/taxes_counter/fop_taxes_group_2_counter.ts

run_fop_taxes_group_3_counter:
	$(TS_NODE) src/taxes_counter/fop_taxes_group_3_counter.ts

run_statement_parser:
	$(TS_NODE) src/statement_parser/index.ts
