/*
 * Copyright (C) 2015 by Domingo Alvarez Duarte <mingodad@gmail.com>
 *
 * Licensed under GPLv3, see http://www.gnu.org/licenses/gpl.html.
 */
 
 
//start dummy nested scope to allow reload without complain about constants already defined 
//also it hides from outer scope anything declared as local
{

local table_rawget = table_rawget; //cache global to local
local table_rawset = table_rawset; //cache global to local

//debug_print("Loading db-api-server.nut\n");

dofile(APP_CODE_FOLDER + "/sqlite-utils.nut");
dofile(APP_CODE_FOLDER + "/session-manager.nut");
local session_pkg = HttpSession("sqapi_", "2P0oaKKl1[<G");
local http_session;

const IP_LOCALHOST = 2130706433;
local isLocalhost = false;
local gRemoteIP = 0;
local isReadOnly = false;

local globals = getroottable();

local METOD_OVERRIDE_KEY = "_method";
local EXTENSION_RE = "%.[^.]+$";
local EXTENSION_JSON = ".json";
local EXTENSION_HTML = ".html";
local EXTENSION_XML = ".xml";
local EXTENSION_BLOB = ".blob";

function generate_tracking_message_id(res_id, host)
{
	//math.srand(os.time());
	local rnd = math.rand() * os.clock();
	local rndstr = format("%.15f", rnd);
	return format("<%.15f.%s-message-%s@%s>", os.time() + os.clock(), rndstr, res_id, host);
}

local function dumpTable(tbl)
{
	foreach(k,v in tbl) debug_print(k + ":" + v + "\n");
}

local local_env = table_weakref(this);
local __code_loaded = {};

local function requireOptionalAppCode(fname){
	local done = table_rawget(__code_loaded, fname, false);
	if(!done) {
		if(existsfile(fname))
		{
			local fcontent = readfile(fname);
			local my_env = local_env.ref();
			my_env.dostring(fcontent);
			//my_env.dofile(fname);
			table_rawset(__code_loaded, fname, true);
		}
	}
}

local function sanitizeInputValue(value)
{
	return escapeHtml(value.trim());
}

//local my_respose_200_format_str = false;
local function get_response_headers_str(content_type="text/html", withBodyFmt=true)
{
	local my_respose_200_format_str = false;
	//if(!my_respose_200_format_str)
	{
		//local domain = session_pkg.http_session_host;
		//if(domain) domain = domain.split(':')[0];
		//else domain = "";
		//local expiration = " Expires=Wed, 01 May 2019 00:00:00 GMT;";
		local expiration = " Max-Age=31536000;";
		my_respose_200_format_str = "HTTP/1.1 200 OK\r\nContent-Type: " + content_type + "; charset=utf-8\r\nCache-Control: no-cache,no-store\r\nContent-Length: %d\r\n";
		if(http_session && session_pkg.SESSION_COOKIE)
		{
			my_respose_200_format_str += "Set-Cookie: " +
				session_pkg.SESSION_COOKIE + "=" + session_pkg.http_session_id + 
					"; Path=/api/; " + expiration + " HttpOnly;\r\nSet-Cookie: " + 
				session_pkg.SESSION_COOKIE_SIGNATURE + "=" + session_pkg.http_session_id_signature + 
					"; Path=/api/; " + expiration + " HttpOnly;\r\n";
		}
		if(withBodyFmt) my_respose_200_format_str += "\r\n%s";
	}
	return my_respose_200_format_str;
}

local function sendJsonContent(request, response_body)
{
	//local resp_fmt = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8;\r\nContent-Length: %d\r\n\r\n%s";
	local resp_fmt = get_response_headers_str("application/json");
	local resp = format(resp_fmt, response_body.len(), response_body);
	request.print(resp);
	return true;
}

local function sendXmlContent(request, response_body)
{
	//local resp_fmt = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8;\r\nContent-Length: %d\r\n\r\n%s";
	local resp_fmt = get_response_headers_str("text/xml", false);
	local resp = format(resp_fmt, response_body.len());
	resp += "\r\n" + response_body;
	request.print(resp);
	return true;
}

local function sendBlobContent(request, response_body)
{
	//local resp_fmt = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8;\r\nContent-Length: %d\r\n\r\n%s";
	local resp_fmt = get_response_headers_str("application/octet-stream", false);
	local resp = format(resp_fmt, response_body.len());
	resp += "\r\n" + response_body;
	request.print(resp);
	return true;
}

local function sendHtmlContent(request, response_body)
{
	//local resp_fmt = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8;\r\nContent-Length: %d\r\n\r\n%s";
	local resp_fmt = get_response_headers_str();
	//debug_print("sendHtmlContent ", resp_fmt, "\n");
	local resp = format(resp_fmt, response_body.len(), response_body);
	request.print(resp);
	return true;
}

function getRequestGetParams(request, get_params)
{
	local query_string = request.info.query_string;
	if(query_string)
	{
		parse_qs_to_table(query_string, get_params);
		return table_rawget(get_params, METOD_OVERRIDE_KEY, false);
	}
	return false;
}

function getRequestPostParams(request, post_params)
{
	//debug_print("\ngetRequestPostParams", __LINE__);
	get_post_fields(request, 100*1024, post_params);
	return table_rawget(post_params, METOD_OVERRIDE_KEY, false);
}

function getRequestParamsAndMethod(request, get_params, post_params)
{
	local method = getRequestPostParams(request, post_params);
	local method_get = getRequestGetParams(request, get_params);
	if(method_get) method = method_get;
	return method ? method : request.info.request_method;
}

local function getUserDBFileName(api_base_folder){
	local dbfname = format("%s%s%s", APP_RUN_FOLDER, api_base_folder, "api.db");
	//debug_print("getUserDBFileName ", dbfname, "\n");
	return dbfname;
}

function sqliteTrace(udata, sql)
{
	if(sql == "-- TRIGGER ") return;
	debug_print(udata, ":", sql, "\n");
}

local function getXviewSql(db, sql, table_name, where_clause)
{
	
	if(table_name.endswith("_xview"))
	{
		sql = SQLiteUtils.exec_get_one(db, "SELECT sql FROM __app_sql WHERE name=?", [table_name]);
		sql = sql.gsub("%-%-where%-start.+%-%-where%-end", where_clause);
	}
	else
	{
		sql += where_clause;
	}
	return sql;
}

function setCustomGetXviewSql(xfunc)
{
	local tmp = getXviewSql;
	getXviewSql = xfunc;
	return tmp;
}

local function getEditLink(db, table_name, edit_link_name, edit_link_value)
{
	auto edit_table_name = SQLiteUtils.getTableEditInstead(db, table_name);
	local edit_link = SQLiteUtils.exec_get_all(db, "SELECT * FROM __table_metadata_edit_links_view WHERE table_id_name=? AND field_id_name=?", [edit_table_name, edit_link_name]);
	if(edit_link)
	{
		edit_link = edit_link[0];
		if(edit_link.show_table_id_name.endswith("_fill_view"))
		{
			local result = SQLiteUtils.exec_get_row_as_table(db, format("SELECT * FROM \"%s\" WHERE \"" + edit_link.show_field_id_name + "\"=?", 
				edit_link.show_table_id_name), [edit_link_value]);
			return var2json(result);
		}
		local result = SQLiteUtils.exec_get_one(db, format("SELECT \"%s\" FROM \"%s\" WHERE \"" + edit_link.show_field_id_name + "\"=?", 
			edit_link.show_text_id_name, edit_link.show_table_id_name), [edit_link_value]);
		return format("{%q:%q}", edit_link_name, result.tostring());
	}
	return null;
}

local function getByIdAsJsonPrepare(db, table_name, id, using_filter=null)
{
	auto sql = "SELECT * FROM \"" + table_name + "\"";
	auto where_clause = " WHERE rowid=?";
	if(using_filter) where_clause += using_filter;
	sql = getXviewSql(db, sql, table_name, where_clause);
	return db.prepare(sql);
}

local function getByIdAsJson(db, table_name, id, using_filter=null)
{
	//local ckstart = os.clock();
	//debug_print("time spent00: ", (os.clock() - ckstart).tostring(), "\n");
	auto edit_table_name = SQLiteUtils.getTableEditInstead(db, table_name);
	local stmt = getByIdAsJsonPrepare(db, edit_table_name, id, using_filter);
	local tbl = {};
	//try {
		tbl.extra_html <- SQLiteUtils.getExtraHtmlForTableName(db, edit_table_name);
	//}catch(e){}
	tbl.accepted_fields <- SQLiteUtils.getAcceptFieldsFields(db, edit_table_name);
	tbl.columns <- stmt.colsAsArray();
	tbl.column_types <- stmt.colsDeclTypeAsArray();
	local rc;
	if(stmt.bind_parameter_count() > 0) rc = stmt.bind(1, id);
	rc = stmt.step();
	tbl.column_sizes <- stmt.colsSizeAsArray();
	local row = stmt.asArray(stmt.AS_STRING_ALWAYS|stmt.WITH_BLOB_AS_NULL);
	stmt.reset();
	tbl.rows <- [row];
	
	local with_child_entries;
	
	if(table_name != edit_table_name) //get view filters if exists
	{
		 with_child_entries = SQLiteUtils.getFilterTables(db, table_name); 
	}
	local with_child_entries2 = SQLiteUtils.getFilterTables(db, edit_table_name);
	if(with_child_entries2)
	{
		if(with_child_entries) with_child_entries.extend(with_child_entries2);
		else with_child_entries = with_child_entries2;
	}
	if(with_child_entries) tbl.with_child_entries <- with_child_entries;

	local with_edit_links = SQLiteUtils.getEditLinkFields(db, edit_table_name);
	if(with_edit_links)
	{
		tbl.with_edit_links <- with_edit_links;
		local cols_tbl = stmt.colsAsTable();

		foreach(k,v in with_edit_links)
		{
			//debug_print("no_server_fill = ", table_rawget(v, "no_server_fill", false), "\n");
			if(table_rawget(v, "no_server_fill", false) == 1) continue;
			local col_idx = cols_tbl[k];
			local col_value = row[col_idx];
			if((type(col_value) == "string") && col_value.len())
			{
				local show_text_id_name = SQLiteUtils.sanitizeDBName(v.show_text_id_name);
				local show_field_id_name = SQLiteUtils.sanitizeDBName(v.show_field_id_name);
				local show_table_id_name = SQLiteUtils.sanitizeDBName(v.show_table_id_name);
				//TODO revise this for security adding v.show_field and v.table_name can allow sql injection
				v.show_field_value <- SQLiteUtils.exec_get_one(db, "SELECT " + show_text_id_name + " FROM " + show_table_id_name + 
					" WHERE \"" + show_field_id_name + "\"=" + col_value.tointeger());
				/*
				if(show_table_id_name.endswith("_fill_view"))
				{
					v.show_fill_values <- SQLiteUtils.exec_get_row_as_table(db, "SELECT * FROM " + show_table_id_name + 
					" WHERE \"" + show_field_id_name + "\"=" + col_value.tointeger());					
				}
				*/
			}
		}
	}
	stmt.finalize();
	local json = var2json(tbl);
	
	/*
	local options = "";
	local rc = stmt_get.bind(1, id);
	local json = stmt_get.asJsonArray(true); //asJsonObject();
	stmt_get.reset();
	local tmp = with_child_entries ? var2json(with_child_entries) : false;
	if(tmp) options += ", \"with_child_entries\": " + tmp;
	tmp = with_edit_links ? var2json(with_edit_links) : false;
	if(tmp) options += ", \"with_edit_links\": " + tmp;		
	if(options.len()) json = json.gsub("%}%s*$",  options + "}");
	*/
	return json;
}

local function getEditListFilters(request, get_params)
{
	local using_filter =  (get_params ? table_rawget(get_params, "childs_table", false) : false);
	if(using_filter)
	{
		local the_id_col = (get_params ? table_rawget(get_params, "id_col", false) : false);
		if(the_id_col)
		{
			local str_filter = "";
			if(using_filter.indexOf(",") >= 0)
			{
				//stacked parameters
				local filter_ary = using_filter.split(',');
				local id_col_ary = the_id_col.split(',');
				if(filter_ary.len() == id_col_ary.len())
				{
					foreach(k, v in filter_ary)
					{
						local id_col = SQLiteUtils.sanitizeDBName(id_col_ary[k]);
						str_filter += " AND " + id_col + "=" + v.tointeger() + " ";
					}
				}
				using_filter = str_filter;
			}
			else
			{
				the_id_col = SQLiteUtils.sanitizeDBName(the_id_col);
				//bellow we only accept integer id and convert then to integer to prevent sql injection
				using_filter =  " AND " + the_id_col + "=" + using_filter.tointeger() + " ";				
			}			
		}
	}
	return using_filter;
}

local function getSearchCondFor(db, table_name)
{
	local bind_count = 0;
	local accept_fields = SQLiteUtils.getAcceptFieldsFields(db, table_name);
	local sql = " AND ( ";
	local count = 0;
	foreach(k, _t in accept_fields)
	{
		if(count++) sql += " OR ";
		sql += " \"" + k + "\" LIKE ? ";
		++bind_count;
	}
	sql += " ) ";
	return [bind_count, sql];
}

local function getJsonList(db, table_name, request, get_params=null, noTableListInstead=false)
{
	auto edit_table_name;
	if(!noTableListInstead) edit_table_name = SQLiteUtils.getTableListInstead(db, table_name);
	else edit_table_name = table_name;
	local using_filter = getEditListFilters(request, get_params);
	local search_str = table_rawget(get_params, "search", false);
	
	//local list_fields = SQLiteUtils.getTableListFields(db, table_name);

	local where_clause = " WHERE 1=1 ";
	local sql = "SELECT * FROM \"" + edit_table_name + "\"";
	local stmt = db.prepare(sql);
	if(stmt.col_declared_type(0).toupper() != "INTEGER") sql = "SELECT rowid, * FROM \"" + edit_table_name + "\"";
	stmt.finalize();
	if(using_filter) where_clause += using_filter;
	local bind_count = 0;
	local search_str_escaped = false;
	if(search_str)
	{
		//on localhost accepts search_str as raw sql
		if(isLocalhost && search_str.startswith(":?"))
		{
			where_clause += " AND " + search_str.slice(2);
		}
		else 
		{
			search_str_escaped = SQLiteUtils.escape_sql_like_search_str(search_str);
			if(search_str_escaped.len())
			{
				local search_cond = getSearchCondFor(db, edit_table_name);
				bind_count = search_cond[0];
				where_clause += search_cond[1];
			}
		}
	}
	
	local xsql = getXviewSql(db, sql, edit_table_name, where_clause);
	if(xsql != sql)
	{
		sql = xsql;
		xsql = 1;
	}

	local limit = table_rawget(get_params, "max_rows", 0);
	if(!limit) limit = SQLiteUtils.getListLimitForTableName(db, edit_table_name);
	if(limit)
	{
		limit = limit.tointeger(); //avoid sql injection
		auto limit_placement_re = "%-%-limit%-start.-%-%-limit%-end";
		auto limit_str = " limit " + limit;
		local list_page_no = table_rawget(get_params, "list_page_no", 0);
		if(list_page_no)
		{
			limit_str += " offset " + (limit.tointeger() * list_page_no.tointeger());
		}
		auto limited_sql = sql.gsub(limit_placement_re, limit_str);
		if(sql != limited_sql) sql = limited_sql;
		else sql += limit_str;
	}
	//debug_print(sql, "\n");
	stmt = db.prepare(sql);
	if(bind_count)
	{
		if(xsql == 1) bind_count = stmt.bind_parameter_count(); //review bind parameters
		while(bind_count) stmt.bind(bind_count--, search_str_escaped);
	}
	local data =  stmt.asJsonArray(true);
	stmt.finalize();
	return data;
}

local function getJsonListByTableId(db, table_id, request, get_params=null)
{
	local table_name = SQLiteUtils.exec_get_one(db, "SELECT name FROM __tables_metadata WHERE id=?", [table_id]);
	return getJsonList(db, table_name, request, get_params, true);
}

local function _bindValueFromForm(stmt, param_idx, value, default_value="")
{
	local type = ::type;
	if(type(value) == "table")
	{
		//in production this should be validating the content
		//if we expect a file do not accept a string only
		if(table_rawin(value, "content-type") && table_rawin(value, "contents"))
		{
			//multipart encoding
			value = table_rawget(value, "contents", default_value);
			stmt.bind_blob(param_idx, value);
			return;
		}
		//fix-me
		//radio box, duplicated form names ??
	}
	else if(type(value) == "string" && value.len() == 0) value = null;
	stmt.bind(param_idx, value);
}

local function checkTableAppSql(edit_table_name)
{
	if(edit_table_name == "__app_sql")
	{
		local pp = SqlPreprocessor();
		pp.preprocessSqlQueries(db);
	}
}

local function doPost(db, table_name, id, values_tbl, empty)
{
	auto edit_table_name = SQLiteUtils.getTableEditInstead(db, table_name);
	if(SQLiteUtils.getIsReadOnlyForTableName(db, edit_table_name)) return false;
	
	local accept_fields = SQLiteUtils.getAcceptFieldsFields(db, edit_table_name);
	if(!accept_fields || !table_len(accept_fields)) return false;
	
	local blob_sql = blob(0,8000);
	blob_sql.write("UPDATE \"", edit_table_name, "\" SET ");
	//debug_print(blob_sql, "\n");
	local stmt = db.prepare("SELECT * FROM " + edit_table_name);
	local stmt_col_names = stmt.colsAsArray();
	local cols_type = stmt.colsDeclTypeAsArray();
	stmt.finalize();
	if( stmt_col_names.find("_mdate_"))
	{
		blob_sql.write(" _mdate_=CURRENT_TIMESTAMP,");
	}
	local has_version = stmt_col_names.find("_version_");
	if(has_version)
	{
		blob_sql.write(" _version_=_version_+1,");
	}
	local has_user = stmt_col_names.find("write_uid");
	local user_id;
	if(http_session) user_id = table_rawget(http_session, "user_id", false);
	//debug_print("doPost: ", has_user, ":", user_id, "\n");
	if(has_user && user_id)
	{
		blob_sql.write(" write_uid=?, write_date=CURRENT_TIMESTAMP,");
	}
	local fields_count = 0;
	foreach(idx, col_type in cols_type)
	{
		local col_name = stmt_col_names[idx];
		if(table_rawin(accept_fields, col_name))
		{
			if(table_rawin(values_tbl, col_name))
			{
				if(col_type == "BLOB")
				{
					local value = table_rawget(values_tbl, col_name);
					if(!value || value.len() == 0)
					{
						if(!table_rawin(values_tbl, "_x_delete_blob_" + col_name))
						{
							table_rawdelete(values_tbl, col_name);
							continue; //no new file to replace and not asking to clear/delete it
						}
					}
				}
				blob_sql.write("\"", col_name, "\"=?,");
				++fields_count;
			}
		}
	}
	
	if(!fields_count) return false;

	blob_sql.resize(blob_sql.len()-1); //cleanup leading comma
	blob_sql.write(" WHERE rowid=? ");
	if(has_version) blob_sql.write(" AND _version_=? ");
	
	local bind_count = 0;
	
	//debug_print(blob_sql.tostring(), "\n");
	local post_stmt = db.prepare(blob_sql.tostring());
	if(has_user && user_id)
	{
		post_stmt.bind(++bind_count, user_id);
	}
	foreach(idx, col_type in cols_type)
	{
		local col_name = stmt_col_names[idx];
		if(table_rawin(accept_fields, col_name))
		{
			if(table_rawin(values_tbl, col_name))
			{
				++bind_count;
				//debug_print(bind_count.tostring(), ":", col_name, ":", table_rawget(values_tbl, col_name).tostring(), "\n");
				_bindValueFromForm(post_stmt, bind_count, table_rawget(values_tbl, col_name));
			}
		}
	}
	post_stmt.bind(++bind_count, id);
	if(has_version) post_stmt.bind(++bind_count, table_rawget(values_tbl, "_version_", 0).tointeger());
	local rc = post_stmt.step() == post_stmt.SQLITE_DONE;
	post_stmt.finalize();
	
	if(rc) checkTableAppSql(edit_table_name);
	
	return rc;
}

local function doDelete(db, table_name, the_id)
{
	auto edit_table_name = SQLiteUtils.getTableEditInstead(db, table_name);
	if(SQLiteUtils.getIsReadOnlyForTableName(db, edit_table_name)) return false;
	auto rc = SQLiteUtils.exec_dml(db, "DELETE FROM \"" + edit_table_name + "\" WHERE rowid=?", [the_id])
	return rc;
}

local function _createInsertStatementForTable(db, tbl_name, accept_fields, tbl_key_values)
{
	local sql = "INSERT INTO \"" + tbl_name + "\"(";
	local values = ") VALUES(";
	local count = 0;
	foreach(k,v in accept_fields)
	{
		if(!table_rawin(tbl_key_values, k)) continue;
		if(count++)
		{
			sql += ",";
			values += ",";
		}
		sql += "\"" + k + "\"";
		values += "?";
	}

	//debug_print("\n_createInsertStatementForTable: ", __LINE__, sql);
	if(count)
	{
		sql += values + ")";
		//debug_print("\n_createInsertStatementForTable: ", sql);
		local stmt = db.prepare(sql);
		count = 1;
		foreach(k,v in accept_fields)
		{
			if(!table_rawin(tbl_key_values, k)) continue;
			_bindValueFromForm(stmt, count++, table_rawget(tbl_key_values, k));
		}
		return stmt;
	}
	return null;
}

local function getNonEmptyStrings(obj_with_string_values, keys)
{
	local result = {};
	foreach(k,_t in keys)
	{
		local v = table_rawget(obj_with_string_values, k, null);
		//debug_print("\ngetNonEmptyStrings: ", k, ":", v, ":", table_len(obj_with_string_values));
		if(v != null && (type(v) == "string"))
		{
			v = v.trim();
			if(!v.len()) continue;
			result[k] <- v;
		}
	}
	return result;
}

local function _doPutNonEmptyFields(db, table_name, values_tbl)
{
	local accept_fields = SQLiteUtils.getAcceptFieldsFields(db, table_name);
	local the_fields = getNonEmptyStrings(values_tbl, accept_fields);

	//debug_print("\n_doPutNonEmptyFields: ", __LINE__);
	local stmt = db.prepare("SELECT * FROM " + table_name);
	local stmt_col_names = stmt.colsAsArray();
	stmt.finalize();
	local has_user = stmt_col_names.find("create_uid");
	local user_id;
	if(http_session) user_id = table_rawget(http_session, "user_id", false);
	//debug_print("_doPutNonEmptyFields: ", has_user, ":", user_id, "\n");
	if(has_user && user_id)
	{
		accept_fields.create_uid <- true;
		the_fields.create_uid <- user_id;
	}
	//debug_print("\n_doPutNonEmptyFields: ", __LINE__);
	stmt = _createInsertStatementForTable(db, table_name, accept_fields, the_fields);
	if(stmt)
	{
		local rc = stmt.step() == SQLite3.SQLITE_DONE;
		stmt.finalize();
		if(rc) checkTableAppSql(table_name);
		return rc;
	}
	return false;
}

local function doPut(db, table_name, values_tbl)
{
	auto edit_table_name = SQLiteUtils.getTableEditInstead(db, table_name);
	if(SQLiteUtils.getIsReadOnlyForTableName(db, edit_table_name)) return false;
	/*
	local IsAutoCommitOn = false;
	local isFieldMetadata = edit_table_name == "_fields_metadata";
	if(isFieldMetadata)
	{
		IsAutoCommitOn = db.IsAutoCommitOn();
		if(!IsAutoCommitOn) db.exec_dml("begin;");
	}
	*/
	return _doPutNonEmptyFields(db, edit_table_name, values_tbl);
}

local function checkAPIRequest(request, request_uri, db, base_uri, tbl_name)
{		
	//local ckstart = os.clock();
	//http_session = session_pkg.doLoadSession(request);
	//debug_print("checkAPIRequest: ", http_session.tostring(), "\n");
	//dumpTable(http_session);
	//local req_count = table_rawget(http_session, "req_count", 0);
	//table_rawset(http_session, "req_count", ++req_count);
	local response_body = false;
	
	//debug_print("\ncheckAPIRequest ", __LINE__, "\t", tbl_name);
	
	local extension = request_uri.match(EXTENSION_RE);
	if(extension)
	{
		request_uri = request_uri.gsub(EXTENSION_RE, "");
	}
	local isJsonRequested = extension == EXTENSION_JSON;
	
	if(request_uri.endswith("/list"))
	{
		local get_params = {};
		getRequestGetParams(request, get_params);
		response_body = getJsonList(db, tbl_name, request, get_params);
	}
	else
	{
		local form_method = "PUT";
		local get_params = {};
		local post_params = {};
		local req_method = getRequestParamsAndMethod(request, get_params, post_params);
		local the_id = request_uri.match(base_uri + "([%w-_]+)");
		
		local setDBError = function()
		{
			response_body = format("{\"request_result\": \"ERROR\", \"request_error\": %q}", db.errmsg());
		}

		local setJsonDBOk = function(changes=0)
		{
			response_body = "{\"request_result\": \"OK\", \"changes\":" + changes + "}";
		}

		local setJsonDBReadOnly = function()
		{
			response_body = "{\"request_result\": \"ERROR\", \"request_error\": \"read only mode\"}";
		}

		if(the_id)
		{
			//local query_string = request.info.query_string;
			switch(req_method)
			{
				case "GET":
					if(extension == EXTENSION_JSON)
					{
						local using_filter = getEditListFilters(request, get_params);
						response_body = getByIdAsJson(db, tbl_name, the_id, using_filter);
					}
					else if(extension == EXTENSION_BLOB)
					{
						local field_name = table_rawget(get_params, "field", false);
						if(field_name)
						{
							auto the_tbl_name = SQLiteUtils.getTableEditInstead(db, tbl_name);
							response_body = SQLiteUtils.getByIdFieldAsBlob(db, the_tbl_name, the_id, field_name);
						}
					}
					//response_body = stmt.asJsonObject();
					break;
				case "POST":
					//debug_print("\nPost ", tbl_name);
					local empty = "empty" + the_id;
					if(isReadOnly) setJsonDBReadOnly();
					else
					{
						if(doPost(db, tbl_name, the_id, post_params, empty))
						{
							setJsonDBOk(db.changes());
						}
						else
						{
							setDBError();
						}
					}
					break;
				case "DELETE":
					//response_body = format("DELETE User requested %s !", the_id);
					if(isReadOnly) setJsonDBReadOnly();
					else
					{
						if(doDelete(db, tbl_name, the_id))
						{
							setJsonDBOk(db.changes());
						}
						else
						{
							setDBError();
						}
					}
					break;
				default:
					response_body = format("User requested with method %s for %s !", req_method, the_id);
			}
		}
		else if(req_method == "PUT")
		{
			//response_body = "PUT User requested !";
			if(isReadOnly) setJsonDBReadOnly();
			else
			{
				if(doPut(db, tbl_name, post_params))
				{
					setJsonDBOk(db.changes());
				}
				else
				{
					setDBError();
				}
			}
		}
	}		
	//session_pkg.doSaveSession(request, http_session);
	if(response_body)
	{
		if(extension == EXTENSION_JSON) return sendJsonContent(request, response_body);
		else if(extension == EXTENSION_BLOB) return sendBlobContent(request, response_body);
		else return sendHtmlContent(request, response_body);
	}
	return response_body != false;
}


local base_uri_api_trimed = "/api";
local base_uri_api = base_uri_api_trimed + "/";

local api_db_handlers = {
	"__set_session_working_user" = function(db, request) 
	{
		local get_params = {};
		getRequestGetParams(request, get_params);
		local user_id = table_rawget(get_params, "user_id", false);
		if(user_id)
		{
			http_session.user_id <- user_id.tointeger();
			return sendJsonContent(request, "{\"result\": \"OK\"}");
		}
		return false;
	},

	"__create_sql_querie" = function (db, request) 
	{
		local get_params = {};
		getRequestGetParams(request, get_params);
		local table_name = table_rawget(get_params, "table", false);
		local query_type = table_rawget(get_params, "query_type", false);
		local max_rows = table_rawget(get_params, "max_rows", 0);
		//debug_print("__create_sql_querie ", table_name, ":", query_type, "\n");
		if((table_name && query_type) && (table_name.len() && query_type.len()))
		{
			table_name = SQLiteUtils.sanitizeDBName(table_name);
			local response_body = SQLiteUtils.createQuery(db, table_name, query_type, max_rows.tointeger());		
			return sendHtmlContent(request, response_body || "not found");					
		}
		return false;
	},

	"__table_field_metadata_info" = function (db, request)
	{
		local get_params = {};
		getRequestGetParams(request, get_params);
		local table_name = table_rawget(get_params, "table", false);
		local field_name = table_rawget(get_params, "field_name", false);
		local asHtml = table_rawget(get_params, "ctype", false);
		//debug_print("table_field_metadata_info ", table_name, ":", field_name, "\n");
		if((table_name && field_name) && (table_name.len() && field_name.len()))
		{
			table_name = SQLiteUtils.sanitizeDBName(table_name);
			field_name = SQLiteUtils.sanitizeDBName(field_name);
			local field_id;
			
			//if we fail we try again with the table to edit
			for(local i=0; i < 2; ++i)
			{
				field_id = SQLiteUtils.exec_get_one(db, [==[
						SELECT tf.id 
						FROM __fields_metadata as f, __table_metadata_fields as tf, __tables_metadata as t 
						WHERE t.name = ?
						AND tf.table_id = t.id
						AND tf.field_id = f.id
						AND f.name = ?
					]==], [table_name, field_name]);
				
				if(field_id || (i > 1)) break;
				table_name = SQLiteUtils.getTableEditInstead(db, table_name);
			}
			
			//debug_print("table_field_metadata_info ", table_name, ":", field_name, ":", field_id, "\n");
			local new_db_table = "__table_metadata_fields";
			local new_base_uri = base_uri_api + new_db_table + "/";
			local new_request_uri = new_base_uri + field_id;
			//debug_print(base_uri_api, ":", new_base_uri, ":", new_db_table, ":", new_request_uri, "\n");
			local result = checkAPIRequest(request, new_request_uri + EXTENSION_JSON, db, new_base_uri, new_db_table);		
			//doSaveSession(request, http_session);
			return result != false;					
		}
		return false;
	},

	"__tables_metadata_info" = function (db, request)
	{
		local get_params = {};
		getRequestGetParams(request, get_params);
		local table_name = table_rawget(get_params, "table", false);
		local asHtml = table_rawget(get_params, "ctype", false);
		//debug_print("table_field_metadata_info ", table_name, ":", field_name, "\n");
		if(table_name && table_name.len())
		{
			table_name = SQLiteUtils.sanitizeDBName(table_name);
			local table_id = SQLiteUtils.exec_get_one(db, [==[
					SELECT t.id 
					FROM __tables_metadata as t 
					WHERE t.name = ?
				]==], [table_name]);
			//debug_print("table_field_metadata_info ", table_name, ":", field_name, ":", field_id, "\n");
			local new_db_table = "__tables_metadata";
			local new_base_uri = base_uri_api + new_db_table + "/";
			local new_request_uri = new_base_uri + table_id;
			//debug_print(base_uri_api, ":", new_base_uri, ":", new_db_table, ":", new_request_uri, "\n");
			local result = checkAPIRequest(request, new_request_uri + EXTENSION_JSON, db, new_base_uri, new_db_table);		
			//doSaveSession(request, http_session);
			return result != false;					
		}
		return false;
	},

	"__get_edit_link" = function (db, request) 
	{
		local get_params = {};
		getRequestGetParams(request, get_params);
		local table_name = table_rawget(get_params, "table", false);
		local field_name = table_rawget(get_params, "field_name", false);
		local field_value = table_rawget(get_params, "field_value", false);
		//debug_print("table_field_metadata_info ", table_name, ":", field_name, "\n");
		if( (table_name && field_name && field_value) && 
			(table_name.len() && field_name.len() && field_value.len()) )
		{
			table_name = SQLiteUtils.sanitizeDBName(table_name);
			field_name = SQLiteUtils.sanitizeDBName(field_name);
			local new_base_uri = base_uri_api + table_name + "/";
			//debug_print(base_uri_api, ":", new_base_uri, ":", table_name, "\n");
			local result = getEditLink(db, table_name, field_name, field_value);
			return sendJsonContent(request, result);
		}
		return false;
	},

	"__get_table_or_view_data" = function (db, request) 
	{
		local get_params = {};
		getRequestGetParams(request, get_params);
		local table_id = table_rawget(get_params, "id", false);
		local response_body = getJsonListByTableId(db, table_id, request, get_params);
		return sendJsonContent(request, response_body);
	},

	"__get_table_view_schema" = function (db, request) 
	{
		local response_body, get_params = {};
		getRequestGetParams(request, get_params);
		local table_name = table_rawget(get_params, "table", false);
		if(table_name)
		{
			table_name = SQLiteUtils.sanitizeDBName(table_name);
			auto sql_base = "select sql from main.sqlite_master where name=?"
			response_body = SQLiteUtils.exec_get_one(db, sql_base, [table_name]);
			if(!response_body)
			{
				response_body = SQLiteUtils.exec_get_one(db, sql_base.replace("main.", "temp."), [table_name]);
			}
		}
		return sendHtmlContent(request, response_body || "not found");
	},

	"__get_table_view_indexes" = function (db, request) 
	{
		local response_body = "", get_params = {};
		getRequestGetParams(request, get_params);
		local table_name = table_rawget(get_params, "table", false);
		if(table_name)
		{
			table_name = SQLiteUtils.sanitizeDBName(table_name);
			local rows = SQLiteUtils.exec_get_all(db, "select sql from sqlite_master where tbl_name=? and type='index'", [table_name]);
			foreach(row in rows)
			{
				response_body += row.sql + "\n\n";
			}
		}
		return sendHtmlContent(request, response_body || "not found");
	},

	"__get_table_view_triggers" = function (db, request) 
	{
		local response_body = "", get_params = {};
		getRequestGetParams(request, get_params);
		local table_name = table_rawget(get_params, "table", false);
		if(table_name)
		{
			table_name = SQLiteUtils.sanitizeDBName(table_name);
			local rows = SQLiteUtils.exec_get_all(db, "select sql from sqlite_master where tbl_name=? and type='trigger'", [table_name]);
			foreach(row in rows)
			{
				response_body += row.sql + "\n\n";
			}
		}
		return sendHtmlContent(request, response_body || "not found");
	},

	"__get_references_in_schema" = function (db, request) 
	{
		local response_body, get_params = {};
		getRequestGetParams(request, get_params);
		local str = table_rawget(get_params, "str", false);
		if(str)
		{
			response_body = SQLiteUtils.getReferencesOnDBSchema(db, str);
		}
		return sendHtmlContent(request, response_body || "not found");
	},

	"__search_in_all_tables" = function (db, request)
	{
		local response_body, get_params = {};
		getRequestGetParams(request, get_params);
		local search_str = table_rawget(get_params, "str", false);
		local search_limit = table_rawget(get_params, "limit", 1);
		if(search_str)
		{
			response_body = SQLiteUtils.searchOnAllTables(db, search_str, search_limit.tointeger());
		}
		return sendHtmlContent(request, response_body || "not found");
	},

	"__update_metadata" = function (db, request)
	{
		SQLiteUtils.doUpdateMetadata(db);
		return sendJsonContent(request, "{\"result\": \"OK\"}");
	},

	"__create_a_backup" = function (db, request)
	{
		local dbfname = db.get_db_name();
		db.backup(dbfname + "." + os.date("%Y-%m-%d-%H-%M-%S"));
		return sendJsonContent(request, "{\"result\": \"OK\"}");
	},

	"__exec_sql" = function (db, request) 
	{
		local response_body, post_params = {};
		getRequestPostParams(request, post_params);
		local sql = table_rawget(post_params, "sql", false);
		local max_rows = table_rawget(post_params, "max_rows", false);
		local query_type = table_rawget(post_params, "query_type", false);
		//debug_print("__exec_sql: ", query_type, ":", sql , "\n");

		if(query_type.startswith("sql_macros_"))
		{
			local sql_pp = new SqlPreprocessor();
			switch(query_type)
			{
			case "sql_macros_base":
				response_body = sql_pp.getPreprocessorQuery(db, sql, "base");
			break;
			case "sql_macros_sql":
				response_body = sql_pp.getPreprocessorQuery(db, sql, "sql");
			break;
			case "sql_macros_insert":
				sql_pp.insertPreprocessorQuery(db, sql);
				response_body = sql;
			break;
			case "sql_macros_update":
				sql_pp.updatePreprocessorQuery(db, sql);
				response_body = sql;
			break;
			case "sql_macros":
				local new_sql = sql_pp.getPreprocessorQuery(db, sql);
				if(new_sql)
				{
					sql = sql_pp.preprocessSqlQueryParams(new_sql, {});
				}
				else break;
			}
			if(response_body)
			{
				return sendHtmlContent(request, response_body);
			}
		}
		else if(query_type.startswith("squilu_"))
		{
			local sql_pp = new SquiLuCode();
			switch(query_type)
			{
			case "squilu_load":
				response_body = sql_pp.getSquiLuCode(db, sql);
			break;
			case "squilu_insert":
				sql_pp.insertSquiLuCode(db, sql);
				response_body = sql;
			break;
			case "squilu_update":
				sql_pp.updateSquiLuCode(db, sql);
				response_body = sql;
			break;
			}
			if(response_body)
			{
				return sendHtmlContent(request, response_body);
			}
		}
		if(sql)
		{
			if(query_type == "select" || query_type == "sql_macros")
			{
				try
				{
					//debug_print("\nPrepare: ", sql);
					local stmt = db.prepare(sql);
					if(stmt.col_count())
					{
						//select type
						response_body = stmt.asJsonArray(true);
					}
					else
					{
						//dml
						local done = stmt.step() == stmt.SQLITE_DONE;
						response_body = var2json({result_ok = (done ? "OK" : "NO"), 
							columns=[(done ? "affected_rows" : "error")], 
							rows=[[ (done ? db.changes() : db.errmsg())]]
							});
					}
					stmt.finalize();
				}
				catch(e)
				{
					response_body = var2json({result_ok = "NO", 
							columns=["error"], 
							rows=[[e]]
							});
				}
				return sendJsonContent(request, response_body);
			}
			else 
			{
				local result = SQLiteUtils.executeQuery(db, query_type, sql);
				return sendJsonContent(request, var2json(result));
			}
		}
		return false;
	}
};

//local getDbFor = SQLiteUtils.getDbFor;
//::setGetDbFor <- function(fun) {getDbFor=fun;};

local custom_index_html;

function setCustomIndexHtml(idx)
{
	custom_index_html = idx;
}

local custom_uri_filter;

function setCustomUriFilter(uri_filter)
{
	custom_uri_filter = uri_filter;
}

local function my_uri_filter(request)
{
	if(custom_uri_filter)
	{
		auto rc = custom_uri_filter(request, 0);
		if(rc)
		{
			switch(rc[0])
			{
				case "json":
					return sendJsonContent(request, rc[1]);
				break;
					return sendHtmlContent(request, rc[1]);
				default:
				
			}
		}
	}
	
	gRemoteIP = table_rawget(request.info.http_headers, "X-Real-IP", false);
	if(!gRemoteIP) gRemoteIP = request.info.remote_ip;
	isLocalhost = gRemoteIP == IP_LOCALHOST;
	isReadOnly = !isLocalhost;
	//debug_print("\nisLocalhost:" + isLocalhost.tostring() + ":" + request.info.remote_ip);
	local request_uri = request.info.uri;
	//debug_print("\n", request_uri);
	if( (request_uri == "/") && custom_index_html )
	{
		return sendHtmlContent(request, custom_index_html);
	}
	else if( request_uri.startswith("/wwwsqldesigner/backend/") )
	{
		//wwwsqldesigner interface
		auto backend = request_uri.match("/php%-([^/]+)/");
		local get_params = {};
		getRequestGetParams(request, get_params);
		local action = table_rawget(get_params, "action", false);
		local keyword = table_rawget(get_params, "keyword", false);
		//debug_print("\nReceived : " + backend + " : " + action + " : " + keyword);
		
		local getXmlFileName = function(bfname)
		{
			return SQLiteUtils.sanitizeDBName(bfname) + ".wwwsqldesigner.xml";
		}
		switch(action)
		{
			case "save":
				local xml = get_post_data(request);
				if(xml)
				{
					//debug_print("\nxml = ", xml, "\n");
					local xml_base_name = getXmlFileName(keyword);
					writefile(xml_base_name, xml);
				}
				request.print("HTTP/1.0 201 Created");
				return true;
			break;

			case "load":
				local xml_base_name = getXmlFileName(keyword);
				if(existsfile(xml_base_name))
				{
					auto xml = readfile(xml_base_name);
					return sendXmlContent(request, xml);
				}
			break;

			case "import":
				keyword = table_rawget(get_params, "database", false);
				local db_name = SQLiteUtils.sanitizeDBName(keyword) + ".db";
				if(existsfile(db_name))
				{
					auto db = SQLite3(db_name);
					auto stmt_tables = db.prepare("select id, name, notes from __tables_metadata where is_view=0 and name not like '/_%' escape '/'");
					//auto stmt_tables = db.prepare("select id, name, notes from __tables_metadata where is_view=0 and name like '/_%' escape '/'"); //custom data dictionary
					auto stmt_fields = db.prepare([==[
						SELECT fm.id, fm.name, fm.type
						FROM "__table_metadata_fields" AS tmf
						JOIN "__tables_metadata" AS tm
							ON tmf.table_id = tm.id
						JOIN "__fields_metadata_list_view" AS fm
							ON tmf.field_id = fm.id
						where tmf.table_id=?
						order by tmf.field_id
					]==]);
					
					auto stmt_fk = db.prepare("SELECT	id, link_field_id_name, link_table_id_name FROM __table_metadata_edit_links_view WHERE table_id=? and field_id=?");
					
					auto xml = readfile(request.get_option("document_root") + "/wwwsqldesigner/wwwsqldesigner.template.xml");
					auto buf = blob();
					
					while(stmt_tables.next_row())
					{
						auto tbl_id = stmt_tables.col(0);
						auto tbl_name = stmt_tables.col(1);
						auto tbl_notes = stmt_tables.col(2);
						
						buf.write("<table name=\"", tbl_name, "\">");

						//debug_print("\nTable : ", tbl_id, " : ",  tbl_name);
						
						auto primary_key;
						stmt_fields.bind(1, tbl_id);
						while(stmt_fields.next_row())
						{
							auto fld_id = stmt_fields.col(0);
							auto fld_name = stmt_fields.col(1);
							auto fld_type = stmt_fields.col(2);
							//FIXME assume first field is a primary key
							if(!primary_key) primary_key = fld_name;
							
							//debug_print("\nField : ", fld_id, " : ",  fld_name, " : ", fld_type);
							buf.write("<row name=\"", fld_name, "\">\n<datatype>", fld_type, "</datatype>\n");
							stmt_fk.bind(1, tbl_id);
							stmt_fk.bind(2, fld_id);
							while(stmt_fk.next_row())
							{
								buf.write("<relation table=\"", stmt_fk.col(2), "\" row=\"", stmt_fk.col(1), "\" />\n");
							}
							stmt_fk.reset();
							buf.write("</row>\n");
						}
						stmt_fields.reset();
						if(primary_key)
						{
							buf.write("<key type=\"PRIMARY\" name=\"\"><part>", primary_key, "</part></key>\n");
						}
						if((type(tbl_notes) == "string") && tbl_notes.len())
						{
							buf.write("<comment>", sanitizeInputValue(tbl_notes) ,"</comment>\n");
						}
						buf.write("</table>\n");
					}
					xml = xml.replace("{tables}", buf.tostring());
					return sendXmlContent(request, xml);
				}
			break;

		}
		return false;
	}
	if( (request_uri == base_uri_api_trimed) ||  request_uri.startswith(base_uri_api) )
	{
		//debug_print("\n", request_uri);
		local uri_parts = request_uri.split('/');
		local uri_parts_len = uri_parts.len();
		
		//debug_print("request_uri ", request_uri, "\n");
		if( uri_parts_len == 1) 
		{
			//if( (request_uri == base_uri_api_trimed) ||  (request_uri == base_uri_api) ||  (request_uri == (base_uri_api + EXTENSION_JSON)) )
			//return sendJsonContent(request, "{\"apis\": [\"/api/odoo/\"]}");
			local buf = blob(0, 8000);
	
			buf.write("{\"apis\": [");
			local count = 0;
			foreach(fname in sqfs.dir(APP_RUN_FOLDER + "/")){
				if(fname == "." || fname == ".." || !fname.endswith(".db")) continue;
				//print(fname);
				fname = fname.gsub("%.db", "");
				if(count++) buf.write(",");
				buf.write("\"/api/", fname, "/\"");
			}
			buf.write("]}");
			return sendJsonContent(request, buf.tostring());
		}
		
		//we have more than 1 part
		local db_base_name = SQLiteUtils.sanitizeDBName(uri_parts[1]);
		
				
		/* ========!!!!!!!!!!!!!!
		* Pay attention to not include characters that need be escaped for regular expressions
		* like [-.+^?{}]
		*/
		
		local base_uri_api_plus_db = base_uri_api + db_base_name + "/";
		//debug_print("base_uri_api ", base_uri_api, "\n");
		local db_base_file_name = APP_RUN_FOLDER + "/" + db_base_name;
		local db_file_name = db_base_file_name + ".db";
		if(!existsfile(db_file_name)) return false;
		local db_tables = SQLiteUtils.getDbFor(db_file_name, true);
		//local db_tables = getDbFor(db_file_name);
		if(AT_DEV_DBG) db_tables.trace(sqliteTrace, "SQL", false);
		//requireOptionalAppCode(db_base_file_name + ".nut");
		
		
		local want_get_tables_and_views = (uri_parts_len == 3) && ((uri_parts[2] == "__get_tables_and_views") || (uri_parts[2] == ".json"));
		
		if( (uri_parts_len == 2)  || want_get_tables_and_views)
		{
			local query_all_tables_and_views = "SELECT id, name, is_view FROM __tables_metadata ORDER BY name";
			//local existing_tables = SQLiteUtils.getCachedQuery(SQLiteUtils.exec_get_all, db_tables, query_all_tables_and_views);
			local existing_tables = SQLiteUtils.exec_get_all( db_tables, query_all_tables_and_views);
			
			if( want_get_tables_and_views ) 
			{
				local result = {request_result="OK", rows=existing_tables};
				return sendJsonContent(request, var2json(result));
			}
			
			//if(request_uri.endswith(EXTENSION_JSON))
			//{
				return sendJsonContent(request, var2json(existing_tables));
			//}
		}
		
		//we have more than 2 parts
		local requested_table_view = SQLiteUtils.sanitizeDBName(uri_parts[2]);
		//debug_print("base_uri : ", base_uri_api, ":", requested_table_view, "\n");
		local base_uri = base_uri_api_plus_db + requested_table_view + "/"; 
				
		local doCleanupToReturn = function(result)
		{
			if(http_session) 
			{
				session_pkg.doSaveSession(request, http_session);
			}
			if(AT_DEV_DBG)
			{
				//without closing databases
				//we get segfault, come here later
				db_tables.close();
				session_pkg.closeAll();
			}
			return result;
		}

		http_session = session_pkg.doLoadSession(request);
		//debug_print("my_uri_filter: ", http_session.tostring(), "\n");
		//dumpTable(http_session);
		
		local api_handler = table_rawget(api_db_handlers, requested_table_view, false);
		if(api_handler)
		{
			if(isLocalhost) return doCleanupToReturn(api_handler(db_tables, request));
			returndoCleanupToReturn(false);
		}

		local table_view_exists = SQLiteUtils.exec_get_one( db_tables, "SELECT id FROM __tables_metadata WHERE name=?", [requested_table_view]);
				
		if( table_view_exists )
		{
			//debug_print("table_view_exists : ", base_uri, "\n");
			local result = checkAPIRequest(request, request_uri, db_tables, base_uri, requested_table_view);
			return doCleanupToReturn(result != false);
		}
				
		return doCleanupToReturn(false);
	}
	else if(request_uri.endswith(".app"))
	{
		local dbname, html_template;
		//debug_print("\n", request_uri);
		
		if(request_uri.endswith("-ide.app"))
		{
			if(!isLocalhost) return false;
			dbname = request_uri.match("([^/]+)%-ide%.app");
			html_template = "/s/sqlite-ide.html";
		}
		else if(request_uri.endswith("-lm.app"))
		{
			dbname = request_uri.match("([^/]+)%-lm%.app");
			html_template = "/s/db-api-app.html";
		}
		else
		{
			if(!isLocalhost) return false;
			dbname = request_uri.match("([^/]+)%.app");
			html_template = "/s/db-api.html";
		}
		if(dbname)
		{
			dbname = SQLiteUtils.sanitizeDBName(dbname);
			if(existsfile(APP_RUN_FOLDER + "/" + dbname + ".db"))
			{
				if(existsfile(APP_CODE_FOLDER + html_template))
				{
					local fc = readfile(APP_CODE_FOLDER + html_template);
					//debug_print(fc);
					fc = fc.replace("/*the_api_base_uri*/", "the_api_base_uri='/api/" + dbname + "/';");
					return sendHtmlContent(request, fc);
				}
			}
		}
	}

	return false;
}

add_uri_filters(my_uri_filter);

::WebDBApiLoaded <- true;
 
//when developing if we need to cleanup something here is the place
local previous_onDevCleanup = table_rawget(globals, "onDevCleanup", false);
::onDevCleanup <- function()
{
	//debug_print("onDevCleanup\n");
	if(previous_onDevCleanup) previous_onDevCleanup();
}

//#this_is_a_flag_to_include_code#//

}
