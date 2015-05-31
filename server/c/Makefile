CC=g++
INCL=-I. -I/usr/local/include/ 
COMMA=,
LIB_DIRS=. /usr/local/lib/
LIBS=$(patsubst %,-L%,$(LIB_DIRS)) -lgsl -lgslcblas -lm $(OPTLIBS) $(patsubst %, -Wl$(COMMA)-rpath=%, $(LIB_DIRS))
CFLAGS=-g -O2 -Wall -Wextra $(INCL) -DNDEBUG $(OPTFLAGS) -std=c++14

SOURCES=$(wildcard *.cpp) 
OBJECTS=$(patsubst %.cpp,%.o,$(SOURCES))

TARGET=main

all: $(TARGET)


dev: CFLAGS=-g -Wall $(INCL) -Wextra $(OPTFLAGS) 
dev: all

%.o: %.cpp
	$(CC) -o $@ -c $< $(CFLAGS) $(INCL)  

$(TARGET): $(OBJECTS)
	$(CC) -o $@ $(OBJECTS) $(CFLAGS) $(LIBS)
	
.PHONY: clean

clean: 
	rm -rf $(OBJECTS) $(TARGET) $(SO_TARGET)

