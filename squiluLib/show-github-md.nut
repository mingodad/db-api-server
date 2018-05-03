#!/usr/bin/env squilu

//foreach(idx, arg in vargv) print(arg.tostring(), "\t", arg);
APP_CODE_FOLDER <- (vargv.len() > 1) ? vargv[1] : (os.getenv("HOME") + "/app/squiluLib");
APP_RUN_FOLDER <- (vargv.len() > 2) ? vargv[2] : os.getenv("PWD");
http_ports <- (vargv.len() > 3) ? vargv[3] : "8086,8087s";
AT_DEV_DBG <- (vargv.len() > 4) ? (vargv[4] == "true") : false;
APP_ROOT_FOLDER <- (vargv.len() > 5) ? vargv[5] : APP_CODE_FOLDER + "/s";
num_threads <- (vargv.len() > 6) ? vargv[6].tointeger() : 1;

//for-each-thread-start

__max_print_stack_str_size <- 1000;

local globals = getroottable();
local WIN32 = os.getenv("WINDIR") != null;
local ANDROID = table_rawget(globals, "jniLog", false);

//#include "../lib/sqlar.nut"
//#include "/home/mingo/bin/squiluLib/sqlar.nut"

//sqpcre2.loadlib("/home/mingo/dev/c/A_libs/pcre2-10.20/.libs/libpcre2-8.so");

local mg;

//auto escape_html_chars_list = " &<>\"'`!@$%()=+{}[]";
auto escape_html_chars_re = "([ &<>\"'`!@$%()=+{}[%]])";

function escapeHtml ( str ){
	if (str){
		return str.gsub(escape_html_chars_re, function(m){ return format("&#x%x;", m[0]);});
	}
}

function unescapeHtml ( str ){
	if (str){
		return str.gsub("(&[^;]-;)", function(m){
			auto n = m.match("&#x(%x%x);");
			if(n) return n.tointeger(16).tochar();
			if(m == "&lt;") return "<";
			if(m == "&bt;") return ">";
			if(m == "&amp;") return "&";
			if(m == "&quote;") return "\"";
			return "??";
		});
	}
}

local http_session;
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
		my_respose_200_format_str = "HTTP/1.1 200 OK\r\nContent-Type: " + content_type + "; charset=utf-8;\r\nCache-Control: no-cache,no-store\r\nContent-Length: %d\r\n";
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

local function sendContent(request, content_type, response_body, extra_header="\r\n")
{
	local resp_fmt = get_response_headers_str(content_type, false);
	local resp = format(resp_fmt, response_body.len()) + extra_header;
	request.print(resp);
	if(::type(response_body) == "string") request.print(response_body);
	else request.write_blob(response_body);
	return true;
}

local function sendSleContent(request, data)
{
	auto buffer = blob(0, data.len() + 4096);
	buffer.write("HTTP/1.1 200 OK\r\nContent-type: text/plain; charset=x-user-defined\r\nConnection: Keep-Alive\r\nContent-Length: ", 
		data.len(), "\r\n\r\n", data);
	request.write_blob(buffer);
/*
	request.print("HTTP/1.1 200 OK\r\nContent-type: text/plain; charset=x-user-defined\r\nConnection: Keep-Alive\r\nContent-Length: ", 
		data.len(), "\r\n\r\n", data);
*/
	return true;
}

local function sendJsonContent(request, response_body)
{
	return sendContent(request, "application/json", response_body);
}

local function sendBlobContent(request, response_body, content_type="application/octet-stream")
{
	return sendContent(request, "application/octet-stream", response_body);
}

local function sendPdfContent(request, response_body, fn, asInline=true)
{
	auto content_disposition = format("Content-Transfer-Encoding: binary\r\nContent-Disposition: %s; filename=%s\r\n\r\n",
		asInline ? "inline" : "attachment", fn);
	return sendContent(request, "application/pdf", response_body, content_disposition);
}

local function sendHtmlContent(request, response_body)
{
	return sendContent(request, "text/html", response_body);
}

local function sendMarkdownContent(request, fname)
{
	auto url_to_cut = "https://raw.githubusercontent.com/artf/grapesjs/gh-pages";
	auto content = readfile(fname);
	auto html = [==[
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <title>Markdown Wiki</title>
    <style type='text/css'>
	html {font-family:Verdana;}
	img {max-width:100%;}
    </style>
  </head>
  <body>
  <div class='content'>
]==];
	//content = content.replace("[[", "![image](").replace("]]", ")");
	content = content.gsub("%[%[([^%]]+)%]%]", "![image](%1)").replace(url_to_cut, "");
	html += markdown2html(content);
	html += "</div></body></html>";
	return sendHtmlContent(request, html);
}

local function send_http_error_500(request, err_msg)
{
	if(AT_DEV_DBG) {
		foreach(k,v in get_last_stackinfo()) debug_print("\n", k, ":", v);
		debug_print("\n", err_msg, "\n")
	}
	local response = format("HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: %d\r\n\r\n%s", 
		err_msg.len(),  err_msg);
	request.write(response, response.len());
	return true;
}

local function show_request_params(request)
{
	request.print("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n")
	request.print("<html><body><h1>Request Info</h1><ul>")
	foreach(k, v in request.info) {
		if ("table" == type(v) ){
			request.print(format("<li><b>%s</b>:</li><ul>", k));
			foreach( k2, v2 in v){
				request.print(format("<li><b>%s</b>: %s</li>", k2, v2));
			}
			request.print("</ul>");
		}
		else request.print(format("<li><b>%s</b>: %s</li>", k, (v == NULL ? "" : v).tostring()));
	}
	request.print("</ul></body></html>");
	return true;
}

local function show_files_with_ext(request, ext)
{
	local data = blob(0, 8192);
	data.write("<html><body><h2>Files List</h2><ul>");
	auto files_list = [];
	//debug_print("\n", APP_ROOT_FOLDER);
	foreach(fn in sqfs.dir(APP_ROOT_FOLDER)) {
		if(!fn.match(ext)) continue;
		files_list.append(fn);
	}
	files_list.sort();
	foreach(fn in files_list) {
		data.write(format("<li><a href=\"/%s\">%s</a></li>", url_encode(fn), fn));
	}
	data.write("</ul></body></html>");
	return sendHtmlContent(request, data);
}

function handle_request(event, request)
{
	if(event == "MG_NEW_REQUEST"){
		//debug_print("\n", request.get_option("num_threads"), request.get_conn_buf());
		try {
			//debug_print("\nHttp :\n", request.info.uri);
			local request_uri = request.info.uri;
			
			if (request_uri == "/SQ/testParams" )
			{
				return show_request_params(request);
			}

			if(request_uri.endswith(".txt"))
			{
				auto txt_fn = request_uri.match("[^/]+%.txt$");
				auto txt_content = readfile(txt_fn);
				auto tpl = readfile("show-absolute.html");
				auto html = tpl.replace("{{pdf_data}}", txt_content);
				return sendHtmlContent(request, html);
			}
			
			if (request_uri == "/index.html" || request_uri == "/" )
			{
				return show_files_with_ext(request, "%.md$");
				//return sendMarkdownContent(request, "Home.md");
			}
			
			auto md_fname = request_uri.match("/(.-%.md)");
			//debug_print("\n", request_uri, "\t", md_fname);
			if(!md_fname)
			{
				md_fname = request_uri.match("/(.+)");
				if(md_fname) md_fname += ".md";
			}
			if(md_fname)
			{
				if(existsfile(md_fname))
				{
					return sendMarkdownContent(request, md_fname);
				}
			}
		}
		catch(exep){
			return send_http_error_500(request, exep);
		}
	}
	return false;
}

//code for load/reload/debug start
local this_script_fn;

function setScriptFileName(fn)
{
	this_script_fn = fn;
}

function getScriptFileName()
{
	return this_script_fn;
}

function getThreadCode(sfn){
	local code = readfile(sfn);
	code = code.match("//for%-each%-thread%-start(.-)//for%-each%-thread%-end") +
		"\nsetScriptFileName(\"" + sfn + "\");\n";

	local extra_code = "";
	
	local checkGlobal = function(gv)
	{
		if (table_rawin(globals, gv)){
			auto value = table_get(globals, gv);
			auto tvalue = type(value);
			if(tvalue == "string") extra_code += format("local " + gv + " = \"%s\";\n", value);
			else extra_code += format("local " + gv + " = %s;\n", value.tostring());
		} else extra_code += "local " + gv + " = false;\n";
	}

	checkGlobal("APP_CODE_FOLDER");
	checkGlobal("APP_RUN_FOLDER");
	checkGlobal("APP_ROOT_FOLDER");
	checkGlobal("AT_DEV_DBG");
	
	code = extra_code + "\n" + code;

	//debug_print(code);
	return code;
}

function getUserCallbackSetup(sfn){
	local code = getThreadCode(sfn);	
	return compilestring( code, "webserver", true, 10 );
}
//code for load/reload/debug end

//for-each-thread-end

local mongoose_start_params = {
	error_log_file = "sq-mongoose.log",
	listening_ports = "127.0.0.1:8080",
	document_root = ".",
	num_threads = 1,
	//enable_tcp_nodelay = "yes",
	//cgi_extensions = "lua",
	//cgi_interpreter = "/usr/bin/lua",
	//cgi_interpreter = "C:\\Lua\\5.1\\lua.exe",
	ssl_certificate = "axTLS.x509_512.pem",
        //"ssl_certificate", "axTLS.x509_1024.pem",
        ssl_chain_file = "axTLS_x509_512.cer",
	extra_mime_types = ".xsl=application/xml",
	master_plugin = function(){
		debug_print("done master_plugin\n");
	},
	master_plugin_exit = function(){
		debug_print("done master_plugin_exit\n");
	},
	//functions to be used by each independent lua vm
	user_callback_setup = getUserCallbackSetup(vargv[0]),
	user_callback_exit = function(){
		debug_print("done user_callback_exit\n");
	},
	user_callback = function(event, request){
		dostring(getThreadCode(getScriptFileName()));
		return handle_request(event, request);
	},
}

function appServerStart(port, document_root){
	print("Listening at", port);
	mg = Mongoose();
	mongoose_start_params.num_threads <- num_threads;
	mongoose_start_params.listening_ports = port;
	mongoose_start_params.document_root = document_root;
	mg.show_errors_on_stdout(true);
	mg.start(mongoose_start_params);
}

function appServerStop(){
	if(mg) {
		mg.stop();
		mg = null;
	}
}

appServerStart(http_ports, APP_ROOT_FOLDER);

if(WIN32 || ANDROID)
{
	stdin.readn('c');
}
else
{
	local SIGINT = os.signal_str2int("SIGINT");
	os.signal(SIGINT);

	local SIGQUIT = os.signal_str2int("SIGQUIT");
	//os.signal(SIGQUIT);

	local SIGTERM = os.signal_str2int("SIGTERM");
	//os.signal(SIGTERM);

	local SIGALRM = os.signal_str2int("SIGALRM");
	//os.signal(SIGALRM);

	local SIGHUP = os.signal_str2int("SIGHUP");
	//os.signal(SIGHUP);

	local run_loop = true;
	while(run_loop) {
		local signal_received = os.get_signal_received();
		if(signal_received) {
			local sig_name = os.signal_int2str(signal_received);
			switch(sig_name) {
				case "SIGINT":
				case "SIGQUIT":
				case "SIGTERM":
					run_loop = false;
				break;
				case "SIGALRM":
					run_loop = false;
				break;
				case "SIGHUP":
					run_loop = false;
				break;
			}
		}
		if(run_loop) {
			os.sleep(100);
		} else {
			print(signal_received, os.signal_int2str(signal_received));
		}
	}
}

appServerStop();

