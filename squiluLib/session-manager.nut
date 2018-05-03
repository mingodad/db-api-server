local table_rawget = table_rawget; //cache global to local
local table_rawset = table_rawset; //cache global to local

class HttpSession {

	SESSION_PREFIX = null;
	SESSION_COOKIE = null;
	SESSION_COOKIE_SIGNATURE = null;
	SESSION_SECRET_KEY = null;
	http_session_is_new = null;
	http_session_id = null;
	http_session_id_signature = null;
	http_session = null;
	http_session_serialized = null;
	http_session_host = null;
	dbSession = null;
	stmt_session_insert = null;
	stmt_session_update = null;
	stmt_session_select = null;
	empty_serialized_table = null;
	
	constructor(prefix, secret_key)
	{
		SESSION_PREFIX = prefix;
		SESSION_COOKIE = SESSION_PREFIX + "session";
		SESSION_COOKIE_SIGNATURE = SESSION_PREFIX + "ss";
		SESSION_SECRET_KEY = SESSION_PREFIX + secret_key;
		empty_serialized_table = serializeTable({});
		http_session_is_new = true;
		dbSession = getDbSession();
	}
	
	destructor()
	{
		closeAll();
	}

	function closeAll()
	{
		if(dbSession)
		{
			stmt_session_insert.finalize();
			stmt_session_update.finalize();
			stmt_session_select.finalize();
			dbSession.close();
			dbSession = null;
		}
	}
	
	function isNewSession()
	{
		return http_session_is_new;
	}
	
	function getDbSession()
	{
		if(!dbSession)
		{
			dbSession = SQLite3(APP_RUN_FOLDER + "/http_session.db");
			dbSession.exec_dml("PRAGMA synchronous = 0;");
			dbSession.exec_dml("PRAGMA journal_mode = WAL");
			//db.exec_dml("begin;");

			dbSession.exec_dml("create table if not exists sessions(id text primary key, data text, ip_address, cdate datetime default CURRENT_TIMESTAMP, mdate datetime);");

			stmt_session_insert = SQLite3Stmt(dbSession, "insert into sessions(id, data, ip_address, mdate) values(?,?,?, CURRENT_TIMESTAMP)");
			stmt_session_update = SQLite3Stmt(dbSession, "update sessions set data=?, mdate=CURRENT_TIMESTAMP where id=?");
			stmt_session_select = SQLite3Stmt(dbSession, "select data from sessions where id=? and ip_address=?");
		}
		return dbSession;
	}


	function create_csrf_token()
	{
		local ntime = os.time();
		local nmili = os.getmillicount();
		return md5(http_session_id, ntime.tostring(), math.rand().tostring(), nmili.tostring(), SESSION_SECRET_KEY);
	}

	function serializeTable(tbl)
	{
		local fd = blob(0, 8192);
		fd.write("return [");
		doSaveTableArrayToFD(tbl, fd);
		fd.write("];");
		return fd.tostring();
	}

	function doSaveTableArrayToSession(tbl, id, ip_address)
	{
		local tbl_serialized = serializeTable(tbl);
		
		if(http_session_serialized == tbl_serialized)
		{
			return; //if session didn't changed do nothing
		}
		if(id) {
			stmt_session_update.reset();
			stmt_session_update.bind(1, tbl_serialized);
			stmt_session_update.bind(2, id);
			local result =  stmt_session_update.step();
			stmt_session_update.reset();
			if( result == SQLite3Stmt.SQLITE_DONE && dbSession.changes() )
			{
				return;
			}
			//debug_print("\n", __LINE__, "\t", dbSession.changes(), "\t", result, "\t", SQLite3Stmt.SQLITE_DONE);
		}
		stmt_session_insert.reset();
		stmt_session_insert.bind(1, id);
		stmt_session_insert.bind(2, tbl_serialized);
		stmt_session_insert.bind(3, ip_address);
		stmt_session_insert.step();
		stmt_session_insert.reset();
		return dbSession.last_row_id();
	}

	function doLoadTableArrayFromSession(id, ip_address)
	{
		stmt_session_select.reset();
		stmt_session_select.bind(1, id);
		stmt_session_select.bind(2, ip_address);
		//debug_print("doLoadTableArrayFromSession", __LINE__, id, ip_address);
		if(stmt_session_select.next_row()) {
			//debug_print("doLoadTableArrayFromSession", __LINE__, id, ip_address);
			http_session_serialized = stmt_session_select.col(0);
			stmt_session_select.reset();
			local func = loadstring(http_session_serialized);
			return func()[0];
		}
		stmt_session_select.reset();
		return {};
	}

	function doLoadSession(request)
	{
		http_session_is_new = true; //to reject GET request to modify data without a previous session
		http_session_serialized = empty_serialized_table;
		http_session_id = request.get_cookie(SESSION_COOKIE);
		local req_info = request.info;
		http_session_id_signature = request.get_cookie(SESSION_COOKIE_SIGNATURE);
		http_session_host = table_rawget(req_info.http_headers, "Host", "");
		local ip_address = IntToDottedIP(req_info.remote_ip);
		local user_agent = table_rawget(req_info.http_headers, "User-Agent", "unknown dummy");

		local calc_ss = function()
		{
			return md5(http_session_id, http_session_host, ip_address, user_agent, SESSION_SECRET_KEY);
		}

		//debug_print("\n", http_session_id, "\t", http_session_id_signature, "\t", ip_address);

		if(http_session_id && http_session_id_signature)
		{
			local ss = calc_ss();
			http_session_is_new = !(ss == http_session_id_signature)
			if(http_session_is_new)
			{
				//debug_print("\n", http_session_id_signature, "\t", ss);
				http_session_id = null;
			}
		}
		else
		{
			http_session_id = null;
		}
		
		if(!http_session_id)
		{
			local ntime = os.time();
			local nmili = os.getmillicount();
			http_session_id = md5(http_session_host, ip_address,
				ntime.tostring(), math.rand().tostring(), 
				user_agent, SESSION_SECRET_KEY, nmili.tostring());
			http_session_id_signature = calc_ss();
			//debug_print("\n", stime, "\t", ip_address, "\t", user_agent, "\t", http_session_id, "\t", http_session_id_signature)
		}
		return doLoadTableArrayFromSession(http_session_id, ip_address);
	}

	function doSaveSession(request, tbl)
	{
		//debug_print("doSaveSession", http_session_id, http_session_id_signature);
		return doSaveTableArrayToSession(tbl, http_session_id, request.info.remote_ip);
	}
}
