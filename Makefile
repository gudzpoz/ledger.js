LDFLAGS= \
	-sEXPORT_ES6=1       \
	-sEXPORT_NAME=ledger \
	-sMODULARIZE=1       \
	-sSTRICT=1           \
	\
	-sALLOW_MEMORY_GROWTH=1 \
	-sSTACK_SIZE=1048576    \
	-sMALLOC=emmalloc       \
	\
	-sFORCE_FILESYSTEM=1       \
	-sWASM_LEGACY_EXCEPTIONS=0 \
	-sINVOKE_RUN=0   \
	-sEXIT_RUNTIME=0 \
	-sEXPORTED_RUNTIME_METHODS=FS,HEAPU8,stringToUTF8,lengthBytesUTF8 \
	-sEXPORTED_FUNCTIONS=_main,_malloc,_free \
	-sINCOMING_MODULE_JS_API=locateFile,print,printErr,preRun \

LIB_DIR=$(CURDIR)/ledger/build/dist

all: ledger/build/ledger.js

ledger/build/Makefile: Makefile
	rm -f ledger/build/Makefile
	cd ledger; env LDFLAGS="$(LDFLAGS)" \
		./acprep --emscripten --boost="$(LIB_DIR)" --output=build/ opt configure

ledger/build/ledger-pre.js: ledger/build/Makefile
	cd ledger; env LDFLAGS="$(LDFLAGS)" \
		./acprep --emscripten --boost="$(LIB_DIR)" --output=build/ opt make
	mv ledger/build/ledger.js $@

ledger/build/ledger.js: ledger/build/ledger-pre.js
	# Emscripten TTY issue: https://github.com/emscripten-core/emscripten/issues/22264
	sed -e 's/if\s*(!stream.tty)/if(!stream.tty||!stream.tty.ops)/g' \
			-e 's/,\s*tty:\s*true,/,tty:false,/g' \
			$< > $@

clean:
	rm -f ledger/build/ledger-pre.js
	rm -f ledger/build/ledger.js
	rm -f ledger/build/CMakeCache.txt

.PHONY: all
