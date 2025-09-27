CXXFLAGS=\
	-sWASM_LEGACY_EXCEPTIONS=0 \

LDFLAGS=\
	-sEXPORT_ES6=1       \
	-sEXPORT_NAME=ledger \
	-sMODULARIZE=1       \
	-sSTRICT=1           \
	\
	-sALLOW_MEMORY_GROWTH=1 \
	-sSTACK_SIZE=1048576    \
	-sMALLOC=emmalloc       \
	\
	-sWASM_LEGACY_EXCEPTIONS=0 \
	\
  -lidbfs.js       \
	-sINVOKE_RUN=0   \
	-sEXIT_RUNTIME=0 \
	-sEXPORTED_RUNTIME_METHODS=FS,IDBFS,HEAPU8,stringToUTF8,lengthBytesUTF8 \
	-sEXPORTED_FUNCTIONS=_main,_malloc,_free \
	-sINCOMING_MODULE_JS_API=locateFile,print,printErr,preRun \

LIB_DIR=$(CURDIR)/ledger/build/dist

all: ledger/build/ledger.js

ledger/build/Makefile: Makefile
	rm -f ledger/build/Makefile
	cd ledger; env CXXFLAGS="$(CXXFLAGS)" LDFLAGS="$(LDFLAGS)" \
		./acprep --emscripten --boost="$(LIB_DIR)" --output=build/ opt configure

ledger/build/ledger.js: ledger/build/Makefile
	cd ledger; env env CXXFLAGS="$(CXXFLAGS)" LDFLAGS="$(LDFLAGS)" \
		./acprep --emscripten --boost="$(LIB_DIR)" --output=build/ opt make

clean:
	rm -f ledger/build/ledger-pre.js
	rm -f ledger/build/ledger.js
	rm -f ledger/build/ledger.wasm
	rm -f ledger/build/CMakeCache.txt
	rm -f ledger/build/Makefile

.PHONY: all
