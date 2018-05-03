curl 'http://127.0.0.1:5076/api/todo_tutorial/__exec_sql' --data 'query_type=drop%20table&max_rows=50&sql=create%20table%20todo(%0A%09id%20integer%20primary%20key%2C%0A%09description%20varchar%20not%20null%20collate%20nocase_slna%2C%0A%09done%20boolean%20default%200%0A)%3B%0A'
curl 'http://127.0.0.1:5076/api/todo_tutorial/__update_metadata' 
curl 'http://127.0.0.1:5076/api/todo_tutorial/__app_menu/.json' --data '_method=PUT&table_view_id=100&label=Todo&_submit_action_=insert'
