#Step by step of a simple application prototype:

####We've received requesto to develop a simple application (it usually start this way) a "Todo List Manager".

####Then we look at the request and proceed accordling by creating an initial prototype, something like this:

		cp dbapi.db toto_tutorial.db

Then we create the following table in the database:

		create table todo(
			id integer primary key,
			description varchar not null collate nocase_slna,
			done boolean default 0
		);

Here is the essential HTTP/API calls made to create our **shine** prototype:

		curl 'http://127.0.0.1:5076/api/todo_tutorial/__exec_sql' --data 'query_type=drop%20table&max_rows=50&sql=create%20table%20todo(%0A%09id%20integer%20primary%20key%2C%0A%09description%20varchar%20not%20null%20collate%20nocase_slna%2C%0A%09done%20boolean%20default%200%0A)%3B%0A'
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__update_metadata'
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__app_menu/.json' --data '_method=PUT&table_view_id=100&label=Todo&_submit_action_=insert'

Then we open our browser at [http://127.0.0.1:5076/todo_tutorial-lm.app](http://127.0.0.1:5076/todo_tutorial-lm.app)
then we check our new application, do some tests and we are ready to deliver our request.  

####Who said that this is a problem ?

* * *

####Now the users start testing our prototype, they find it really simple and does what they asked for.

Then suddenly they realize that after adding several "todo items" it starts to get a bit messy,
it's not easy to see what still need to be done because they are all interleaved.

And they ask if it's possible to have a way to see only what's node "done".

And we think a bit and realize that we can solve it with view that filter the item not done:

		CREATE VIEW todo_not_done_list_view AS
		select *
		from todo a
		where a.done = 0;
		
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__exec_sql' --data 'query_type=drop%20table&max_rows=50&sql=CREATE%20VIEW%20todo_not_done_list_view%20AS%0Aselect%20*%0Afrom%20todo%20a%0Awhere%20a.done%20%3D%200%3B%0A'
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__update_metadata'
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__app_menu/.json' --data '_method=PUT&table_view_id=101&label=Not%20Done&_submit_action_=insert'

####And we've done it again, still not that hard !

* * *

####And our users check it again and say how nice ! And continue testing it.

Then they realize that when there is several "todo items" some of then could be more important than the others
and they need a way to assign a priority to then.

So after some thought we come to the conclusion that we'll need an extra field on our table to record the priority,
also based on our experience we know that normally the quantity of attributes users want to use change with time and usage,
so we need an extra table to store the priorities.

		CREATE TABLE todo_priority(
			id integer primary key,
			description varchar not null collate nocase_slna
		);

		curl 'http://127.0.0.1:5076/api/todo_tutorial/__exec_sql'  --data 'query_type=drop%20table&max_rows=50&sql=CREATE%20TABLE%20todo_priority(%0A%09id%20integer%20primary%20key%2C%0A%09description%20varchar%20not%20null%20collate%20nocase_slna%0A)%3B%0A'
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__update_metadata'
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__app_menu/.json' --data '_method=PUT&table_view_id=102&label=Prorities&_submit_action_=insert'

But now we already have data on our "todo" table and we need to alter it preserving the data,
most databases have an instruction to alter tables in place but sqlite3 the one we are using
do not have a full implementation of "ALTER TABLE" but with a bit of code we can generate
the boilerplate to achieve the same result,
[http://127.0.0.1:5076/todo_tutorial-ide.app](http://127.0.0.1:5076/todo_tutorial-ide.app)
will generate the boilerplate for us, **but we need to customize it**.

		PRAGMA foreign_keys=OFF;
		BEGIN;
		CREATE TABLE todo___new(
			id integer primary key,
			description varchar not null collate nocase_slna,
			priority_id integer references todo_priority(id),
			done boolean default 0
		);

		INSERT INTO "todo___new"(
			"id",
			"description",
			"done"
			)
		SELECT
			"id",
			"description",
			"done"
		FROM "todo";

		DROP TABLE "todo";
		ALTER TABLE "todo___new" RENAME TO "todo";
		PRAGMA foreign_key_check;
		COMMIT;
		PRAGMA foreign_keys=ON;

At the same time we create an "edit link" for the "priority_id" field to allow it be filled by selecting from the "todo_priority" table
and a "table filter" from the "todo_priority" on to the "todo" table (**cross references**).

		curl 'http://127.0.0.1:5076/api/todo_tutorial/__exec_sql' --data 'query_type=schema%20update%20norefs&max_rows=50&sql=PRAGMA%20foreign_keys%3DOFF%3B%0A%0ABEGIN%3B%0A%0ACREATE%20TABLE%20todo___new(%0A%09id%20integer%20primary%20key%2C%0A%09description%20varchar%20not%20null%20collate%20nocase_slna%2C%0A%09priority_id%20integer%20references%20todo_priority(id)%2C%0A%09done%20boolean%20default%200%0A)%3B%0A%0AINSERT%20INTO%20%22todo___new%22(%0A%09%22id%22%2C%0A%09%22description%22%2C%0A%09%22done%22%0A%09)%0ASELECT%0A%09%22id%22%2C%0A%09%22description%22%2C%0A%09%22done%22%0AFROM%20%22todo%22%3B%0A%0ADROP%20TABLE%20%22todo%22%3B%0A%0AALTER%20TABLE%20%22todo___new%22%20RENAME%20TO%20%22todo%22%3B%0A%0APRAGMA%20foreign_key_check%3B%0A%0ACOMMIT%3B%0A%0APRAGMA%20foreign_keys%3DON%3B'
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__update_metadata'
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__table_metadata_edit_links_list_view/.json' --data '_method=PUT&table_id=100&field_id=175&link_table_id=102&link_field_id=1&show_table_id=102&show_field_id=1&show_text_id=173&_submit_action_=insert'
		curl 'http://127.0.0.1:5076/api/todo_tutorial/__table_metadata_filter_tables_list_view/.json' --data '_method=PUT&table_id=102&table_filtered_id=100&table_filtered_field_id=175&name=Todo&_submit_action_=insert'

####Well it seems that adding/changing things starts to require a bit more work, but still not that hard !

* * *

##Let's pause here and look at common patterns that arise when building applications that manipulate data and corss references.

####If we look in the literature we can see mention to classic patterns like **one to one**, **one to many**, **many to many**, ...

And most of the time we'll be composing our application of lots of those patterns (some kind of copy & paste then or attaching lego like blocks).

Let's look at a more featured **todo** prototype  at [http://127.0.0.1:5076/todo-lm.app](http://127.0.0.1:5076/todo-lm.app).

And here is a basic entity relationship diagram at [http://127.0.0.1:5076/wwwsqldesigner](http://127.0.0.1:5076/wwwsqldesigner)
that was generated from our prototype.

##Let's see if someone have any questions/critiques to what was presented so far ?

* * *

