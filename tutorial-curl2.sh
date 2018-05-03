curl 'http://127.0.0.1:5076/api/todo_tutorial/__exec_sql' --data 'query_type=drop%20table&max_rows=50&sql=CREATE%20VIEW%20todo_not_done_list_view%20AS%0Aselect%20*%0Afrom%20todo%20a%0Awhere%20a.done%20%3D%200%3B%0A'
curl 'http://127.0.0.1:5076/api/todo_tutorial/__update_metadata' 
curl 'http://127.0.0.1:5076/api/todo_tutorial/__app_menu/.json' --data '_method=PUT&table_view_id=101&label=Not%20Done&_submit_action_=insert'
