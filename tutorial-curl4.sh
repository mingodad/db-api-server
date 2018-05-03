#curl 'http://127.0.0.1:5076/api/todo_tutorial/__exec_sql' --data 'query_type=schema%20update%20norefs&max_rows=50&sql=PRAGMA%20foreign_keys%3DOFF%3B%0A%0ABEGIN%3B%0A%0ACREATE%20TABLE%20todo___new(%0A%09id%20integer%20primary%20key%2C%0A%09description%20varchar%20not%20null%20collate%20nocase_slna%2C%0A%09priority_id%20integer%20references%20todo_priority(id)%2C%0A%09done%20boolean%20default%200%0A)%3B%0A%0AINSERT%20INTO%20%22todo___new%22(%0A%09%22id%22%2C%0A%09%22description%22%2C%0A%09%22done%22%0A%09)%0ASELECT%0A%09%22id%22%2C%0A%09%22description%22%2C%0A%09%22done%22%0AFROM%20%22todo%22%3B%0A%0ADROP%20TABLE%20%22todo%22%3B%0A%0AALTER%20TABLE%20%22todo___new%22%20RENAME%20TO%20%22todo%22%3B%0A%0APRAGMA%20foreign_key_check%3B%0A%0ACOMMIT%3B%0A%0APRAGMA%20foreign_keys%3DON%3B'
#curl 'http://127.0.0.1:5076/api/todo_tutorial/__update_metadata'
#curl 'http://127.0.0.1:5076/api/todo_tutorial/__table_metadata_edit_links_list_view/.json' --data '_method=PUT&table_id=100&field_id=175&link_table_id=102&link_field_id=1&show_table_id=102&show_field_id=1&show_text_id=173&_submit_action_=insert'
curl 'http://127.0.0.1:5076/api/todo_tutorial/__table_metadata_filter_tables_list_view/.json' --data '_method=PUT&table_id=102&table_filtered_id=100&table_filtered_field_id=175&name=Todo&_submit_action_=insert'
