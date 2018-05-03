build-type ?=debug

#BASE_FOLDER=$(HOME)/dev/SquiLu
BASE_FOLDER=$(shell echo $$PWD)/..
#$(warning "BASE_FOLDER=${BASE_FOLDER}")
SQ_FOLDER=$(BASE_FOLDER)/SquiLu
OBJDIR := obj

HOST_OSTYPE := $(shell uname -s)
#$(warning "HOST_OSTYPE=${HOST_OSTYPE}")

HOST_ARCH := $(shell uname -m)
#$(warning "HOST_ARCH=${HOST_ARCH}")

#ifneq ($(findstring "64", $(HOST_ARCH)), "")
#	TARGET_BITS64=1
#endif

#ifneq ($(findstring "32", $(HOST_ARCH)), "")
#	TARGET_BITS32=1
#endif

ifeq ($(findstring debug, $(build-type)), debug)
	OBJDIR := $(OBJDIR)/$(build-type)
	CFLAG_OPT := -g
endif

ifeq ($(findstring release, $(build-type)), release)
	OBJDIR := $(OBJDIR)/$(build-type)
	CFLAG_OPT := -O3 -DNDEBUG=1
endif

squilu := squilu-$(build-type)

#declared empty to incrementally add to it bellow
CFLAGS = 
CXXFLAGS =
LDFLAGS =
LIBDIR =
LIB =
INC =
#end empty declarations

CC = gcc
CXX = g++

#CC += -std=c99 <-- bug using gcc 7.2 sqlite3.c
CXX += -std=c++11

INC +=  -I$(SQ_FOLDER)/include -I$(SQ_FOLDER)/sqstdlib -I$(SQ_FOLDER)/squirrel \
	-I$(BASE_FOLDER)

LIBDIR +=  -L$(BASE_FOLDER)/lib
LIB +=  -lpthread -lm

ifdef WIN32
EXE_EXT = ".exe"
LIB +=  -lws2_32 -lole32 -lrpcrt4
else
LIB +=  -ldl
ifndef LOCAL-ZLIB
LIB +=  -lz
endif
endif

LDFLAGS +=  $(LIB)
CFLAGS += $(INC) $(CFLAG_OPT) -Wall -fno-strict-aliasing
CXXFLAGS += -fno-exceptions -fno-rtti

ifdef WITH-OLD-GCC
CFLAGS += -DSHA1_NO_ASM -I$(BASE_FOLDER)/curl/include -DWITHOUTH_SHA512
endif

ifdef WIN32
CFLAGS += -DWIN32 -DINET_ATON
endif

ifdef TARGET_BITS32
	CFLAGS += -m32
endif

ifdef ENABLE_LTO
	CFLAGS += -flto
endif

CFLAGS += \
	-DNO_SQ_PDF=1 \
	-DNO_RS232=1 \
	-DNO_TINYXML2=1 \
	-DNO_ABSTRACT_METHOD \
	-DCUSTOM_DELETE_OPERATOR \
	-D_DEBUG_DUMP33=1 \
	-D_FILE_OFFSET_BITS=64 \
	-DHAVE_STDINT=1 \
	-DNEED_SUBLATIN_C2=1 \
	-DNO_EXCEPTION_KEY_NOT_FOUND0=1 \
	-DNO_GARBAGE_COLLECTOR00=1 \
	-DNO_POPEN=1 \
	-DNO_SSL_DL=1 \
	-DONLY_ASCII=1 \
	-DPDF_USING_ZLIB=1 \
	-DRS232_STATIC=1 \
	-DSSL_STATIC_LIBRARY=1 \
	-DUSE_OPENSSL2=1 \
	-DUSE_SIGNAL_HANDLER=1 \
	-DWITH_DAD_EXTRAS=1 \
	-DWITH_MYSQL2=1 \
	-DWITH_POSTGRESQL2=1 \

SOURCES= #declared empty to incrementally add bellow

#SquiLu
SOURCES += \
	SquiLu/squirrel/lua-regex.c  \
	SquiLu/squirrel/sqapi.cpp  \
	SquiLu/squirrel/sqbaselib.cpp  \
	SquiLu/squirrel/sqclass.cpp  \
	SquiLu/squirrel/sqcompiler.cpp  \
	SquiLu/squirrel/sqdebug.cpp  \
	SquiLu/squirrel/sqfuncstate.cpp  \
	SquiLu/squirrel/sqlexer.cpp  \
	SquiLu/squirrel/sq_lexer.cpp  \
	SquiLu/squirrel/sqmem.cpp  \
	SquiLu/squirrel/sqobject.cpp  \
	SquiLu/squirrel/sqstate.cpp  \
	SquiLu/squirrel/sqtable.cpp  \
	SquiLu/squirrel/sqvm.cpp  \
	SquiLu/squirrel/sublatin.c \

CFLAGS += \
	-DPROFILE_SQVM0=1 \
	-DSQ_SUBLATIN=1 \
	-DSQUSEDOUBLE=1 \
	-DSQ_ENABLE_INCLUDES=1

ifdef TARGET_BITS64
CFLAGS += \
	-D_SQ64x=1 \
	-DSQUSEDECIMAL64x=1
endif


#SquiLu stdlib
SOURCES += \
	SquiLu/sqstdlib/sqstdaux.cpp  \
	SquiLu/sqstdlib/sqstdblob.cpp  \
	SquiLu/sqstdlib/sqstdio.cpp  \
	SquiLu/sqstdlib/sqstdmath.cpp  \
	SquiLu/sqstdlib/sqstdrex.cpp  \
	SquiLu/sqstdlib/sqstdstream.cpp  \
	SquiLu/sqstdlib/sqstdstring.cpp  \
	SquiLu/sqstdlib/sqstdsystem.cpp

CFLAGS += \
	-DSQ_USE_MKSTEMP=1 \
	-DSQ_USE_LOCALTIME_R=1

ifndef NO-UUID
CFLAGS += \
	-DWITH_UUID=1
endif

ifneq ($(findstring, Linux, $(HOST_OSTYPE)), "")
ifndef WIN32
ifndef DARWIN
LDFLAGS +=  -lrt
ifndef NO-UUID
LDFLAGS +=  -luuid
endif
endif
endif
endif

#SquiLu extensions
SOURCES += \
	SquiLu-ext/dynamic_library.cpp \
	SquiLu-ext/sq_base64.cpp  \
	SquiLu-ext/sq_bitvector.cpp  \
	SquiLu-ext/sq_pack.cpp  \
	SquiLu-ext/sqratimport.cpp


#SquiLu slave vm extension
SOURCES += \
	SquiLu-ext/sq_slave_vm.cpp

CFLAGS += -DSLAVE_VM_WITH_OS_THREADS=1


#SquiLu lua socket extension
SOURCES += \
	SquiLu-ext/lua_socket.cpp  \
	SquiLu-ext/sq_socket.cpp

ifndef WIN32
	CFLAGS += -DHAS_UNIX_DOMAIN_SOCKETS=1
endif


#SquiLu mongoose http server extension
SOURCES += \
	SquiLu-ext/mongoose.c  \
	SquiLu-ext/sq_mongoose.cpp

#SquiLu axtls extension
AXTLS_PATH := myaxtls
AXTLS_SRC_FILES += \
	SquiLu-ext/sq_axtls.c \
	$(AXTLS_PATH)/aes.c \
	$(AXTLS_PATH)/asn1.c \
	$(AXTLS_PATH)/bigint.c \
	$(AXTLS_PATH)/crypto_misc.c \
	$(AXTLS_PATH)/gen_cert.c \
	$(AXTLS_PATH)/hmac.c \
	$(AXTLS_PATH)/loader.c \
	$(AXTLS_PATH)/md5.c \
	$(AXTLS_PATH)/openssl.c \
	$(AXTLS_PATH)/os_port.c \
	$(AXTLS_PATH)/p12.c \
	$(AXTLS_PATH)/rc4.c \
	$(AXTLS_PATH)/rsa.c \
	$(AXTLS_PATH)/sha1.c \
	$(AXTLS_PATH)/sha256.c \
	$(AXTLS_PATH)/tls1.c \
	$(AXTLS_PATH)/tls1_clnt.c \
	$(AXTLS_PATH)/tls1_svr.c \
	$(AXTLS_PATH)/x509.c

ifndef WITH-OLD-GCC
AXTLS_SRC_FILES += \
	$(AXTLS_PATH)/sha384.c \
	$(AXTLS_PATH)/sha512.c
endif

AXTLS_OPT_DEFINES := \
	-DCONFIG_SSL_ENABLE_CLIENT2=1 \
	-DSSL_STATIC_LIBRARY=1 \
	-DAXTLS_LIBRARY=1 \
	-DCONFIG_OPENSSL_COMPATIBLE=1 \
	-DCONFIG_SSL_CTX_MUTEXING=1 \
	-DCONFIG_SSL_USE_DEFAULT_KEY=1 \
	-DHAVE_STDINT=1 \
	-DNO_SSL_DL=1 \
	-DUSE_AXTLS=1 \
	-DUSE_AXTLS_ON_MEMORY=1 \
	-DSSL_STATIC_LIBRARY=1 \
	-DCONFIG_BIGINT_BARRETT=1

AXTLS_INCLUDE_DIRS := -I$(BASE_FOLDER)/$(AXTLS_PATH)
CFLAGS += $(AXTLS_OPT_DEFINES) $(AXTLS_INCLUDE_DIRS)
SOURCES += $(AXTLS_SRC_FILES)

#SquiLu gumbo html parser extension
GUMBO_PATH := gumbo
GUMBO_SRC_FILES := \
	SquiLu-ext/sq_gumbo.cpp  \
	$(GUMBO_PATH)/attribute.c \
	$(GUMBO_PATH)/char_ref.c \
	$(GUMBO_PATH)/error.c \
	$(GUMBO_PATH)/parser.c \
	$(GUMBO_PATH)/string_buffer.c \
	$(GUMBO_PATH)/string_piece.c \
	$(GUMBO_PATH)/tag.c \
	$(GUMBO_PATH)/tokenizer.c \
	$(GUMBO_PATH)/utf8.c \
	$(GUMBO_PATH)/util.c \
	$(GUMBO_PATH)/vector.c

GUMBO_INCLUDE_DIRS := -I$(BASE_FOLDER)/$(GUMBO_PATH)
CFLAGS += $(GUMBO_INCLUDE_DIRS)
SOURCES += $(GUMBO_SRC_FILES)

#SquiLu sqlite3 extension
SOURCES += \
	SquiLu-ext/sq_sqlite3.cpp \
	SquiLu-ext/sqlite3.c
#	SquiLu-ext/sqlite3.h

CFLAGS += \
	-DTHREADSAFE=1 \
	-DSQLITE_DEFAULT_AUTOVACUUM=1 \
	-DSQLITE_DEFAULT_FILE_FORMAT=4 \
	-DSQLITE_DEFAULT_FOREIGN_KEYS=1 \
	-DSQLITE_ENABLE_COLUMN_METADATA=1 \
	-DSQLITE_ENABLE_EXTENSION_FUNCTIONS=1 \
	-DSQLITE_ENABLE_FTS3_PARENTHESIS=1 \
	-DSQLITE_ENABLE_FTS4=1 \
	-DSQLITE_ENABLE_FTS5=1 \
	-DSQLITE_ENABLE_RTREE=1 \
	-DSQLITE_ENABLE_STAT4=1 \
	-DSQLITE_ENABLE_UNLOCK_NOTIFY=1 \
	-DSQLITE_HAS_CODEC=1 \
	-DSQLITE_OMIT_TCL_VARIABLE=1 \
	-DSQLITE_SOUNDEX=1 \
	-DSQLITE_USE_URI=1 \
	-DUSE_BITVECTOR=1 \
	-DSQLITE_ENABLE_SESSION=1 \
	-DSQLITE_ENABLE_PREUPDATE_HOOK=1 \
	-DSQLITE_ENABLE_JSON1=1 \
	-DSQLITE_OMIT_PREPARED=1

#SquiLu tweetnacl extension
SOURCES += \
	SquiLu-ext/sq_tweetnacl.cpp \
	SquiLu-ext/tweetnacl.c \
	SquiLu-ext/randombytes.c

#SquiLu fossil diff/patch extension
SOURCES += \
	SquiLu-ext/sq_fossil.cpp \
	SquiLu-ext/fossil-delta.c

#SquiLu markdown extension
SOURCES += \
	SquiLu-ext/sq_markdown.cpp  \
	md4c/md4c/md4c.c \
	md4c/md2html/entity.c \
	md4c/md2html/render_html.c
	
CFLAGS += -I$(BASE_FOLDER)/md4c/md4c -I$(BASE_FOLDER)/md4c/md2html

#SquiLu libcurl extension
SOURCES += \
	SquiLu-ext/sq_libcurl.cpp

CFLAGS += -DSQ_USE_EASYCURL=1

ifdef WITH_MPDECIMAL

#SquiLu mpdecimal extension
MPDECIMAL_PATH := mpdecimal-2.4.2
MPDECIMAL_SRC_FILES := \
	SquiLu-ext/sq_decimal.cpp  \
	$(MPDECIMAL_PATH)/basearith.c \
	$(MPDECIMAL_PATH)/context.c \
	$(MPDECIMAL_PATH)/constants.c \
	$(MPDECIMAL_PATH)/convolute.c \
	$(MPDECIMAL_PATH)/crt.c \
	$(MPDECIMAL_PATH)/mpdecimal.c \
        $(MPDECIMAL_PATH)/mpsignal.c \
	$(MPDECIMAL_PATH)/difradix2.c \
	$(MPDECIMAL_PATH)/fnt.c \
	$(MPDECIMAL_PATH)/fourstep.c \
	$(MPDECIMAL_PATH)/io.c \
	$(MPDECIMAL_PATH)/memory.c \
	$(MPDECIMAL_PATH)/numbertheory.c \
        $(MPDECIMAL_PATH)/sixstep.c \
	$(MPDECIMAL_PATH)/transpose.c

MPDECIMAL_OPT_DEFINES := \
	-DWITH_MPDECIMAL=1 \
	-DMPD_PREC=9 \
	-DMPD_DPREC=18 \
	-DWITH_MPDECIMAL=1

ifdef TARGET_IOS
	MPDECIMAL_OPT_DEFINES += -DCOMPILING_FOR_IOS=1
endif

ifdef TARGET_BITS32
	MPDECIMAL_OPT_DEFINES += -DCONFIG_32=1
else
	MPDECIMAL_OPT_DEFINES += -DCONFIG_64=1
endif

ifdef TARGET_ARM
	MPDECIMAL_OPT_DEFINES += -DANSI=1
else
	MPDECIMAL_OPT_DEFINES += -DASM=1
endif

MPDECIMAL_INCLUDE_DIRS := -I$(BASE_FOLDER)/$(MPDECIMAL_PATH)
CFLAGS += $(MPDECIMAL_OPT_DEFINES) $(MPDECIMAL_INCLUDE_DIRS)
SOURCES += $(MPDECIMAL_SRC_FILES)

endif

#SquiLu zlib & minizip extension
MINIZIP_PATH := minizip
MINIZIP_SRC_FILES := \
	SquiLu-ext/sq_zlib.cpp \
	$(MINIZIP_PATH)/ioapi.c \
	$(MINIZIP_PATH)/mztools.c \
	$(MINIZIP_PATH)/unzip.c \
	$(MINIZIP_PATH)/zip.c

#	SquiLu-ext/sq_miniz.cpp \
#	SquiLu-ext/vogl_miniz.c \
#	SquiLu-ext/vogl_miniz_zip.c \

MINIZIP_OPT_DEFINES := \
	-DNOCRYPT

MINIZIP_INCLUDE_DIRS := -I$(BASE_FOLDER)/$(MINIZIP_PATH)
CFLAGS += $(MINIZIP_OPT_DEFINES) $(MINIZIP_INCLUDE_DIRS)
SOURCES += $(MINIZIP_SRC_FILES)

ifdef LOCAL-ZLIB
ZLIB_PATH := zlib-1.2.8
ZLIB_SRC_FILES := \
	$(ZLIB_PATH)/adler32.c \
	$(ZLIB_PATH)/compress.c \
	$(ZLIB_PATH)/crc32.c \
	$(ZLIB_PATH)/deflate.c \
	$(ZLIB_PATH)/gzclose.c \
	$(ZLIB_PATH)/gzlib.c \
	$(ZLIB_PATH)/gzread.c \
	$(ZLIB_PATH)/gzwrite.c \
	$(ZLIB_PATH)/infback.c \
	$(ZLIB_PATH)/inffast.c \
	$(ZLIB_PATH)/inflate.c \
	$(ZLIB_PATH)/inftrees.c \
	$(ZLIB_PATH)/trees.c \
	$(ZLIB_PATH)/uncompr.c \
	$(ZLIB_PATH)/zutil.c

ZLIB_INCLUDE_DIRS := -I$(BASE_FOLDER)/$(ZLIB_PATH)
CFLAGS += $(ZLIB_INCLUDE_DIRS)
SOURCES += $(ZLIB_SRC_FILES)

endif

#SquiLu file system extension
SOURCES += \
	SquiLu-ext/sq_fs.cpp


#SquiLu extensions
SOURCES += \
	SquiLu-ext/sq_mix.cpp \
	SquiLu-ext/dad_utils.cpp


SOURCES_PROG = SquiLu/sq/sq.c $(SOURCES)

OBJECTS_C = $(SOURCES:.c=.o)
OBJECTS = $(addprefix $(OBJDIR)/, $(OBJECTS_C:.cpp=.o))
OBJECTS_PROG_C = $(SOURCES_PROG:.c=.o)
OBJECTS_PROG = $(addprefix $(OBJDIR)/, $(OBJECTS_PROG_C:.cpp=.o))

#ensure that directories exists
ensure-dir = -mkdir -p $(patsubst %/,%,$(dir $(1:%/=%)))

$(OBJDIR)/%.o: $(BASE_FOLDER)/%.c
	$(call ensure-dir, $@)
	$(CC) -c -o $@ $< $(CFLAGS)
	
$(OBJDIR)/%.o: $(BASE_FOLDER)/%.cpp
	$(call ensure-dir, $@)
	$(CXX) -c -o $@ $< $(CFLAGS) $(CXXFLAGS)

$(squilu)$(EXE_EXT): $(OBJECTS_PROG)
	$(CC) $(CFLAGS) -o $@ $(OBJECTS_PROG) $(LIBDIR) $(LDFLAGS)
	$(AR) rcs lib$(squilu).a $(OBJECTS)
