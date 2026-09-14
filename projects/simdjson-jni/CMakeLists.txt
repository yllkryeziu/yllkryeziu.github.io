cmake_minimum_required(VERSION 3.20)
project(simdjson_jni CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

include(CheckCXXCompilerFlag)
check_cxx_compiler_flag("-march=native" HAS_MARCH_NATIVE)
check_cxx_compiler_flag("-mcpu=native" HAS_MCPU_NATIVE)

if(HAS_MARCH_NATIVE)
  set(TUNE_FLAG "-march=native")
elseif(HAS_MCPU_NATIVE)
  set(TUNE_FLAG "-mcpu=native")
else()
  set(TUNE_FLAG "")
endif()
message(STATUS "simdjson_jni tuning flag: ${TUNE_FLAG}")

if(NOT DEFINED JAVA_HOME_DIR)
  set(JAVA_HOME_DIR $ENV{JAVA_HOME})
endif()
if(NOT JAVA_HOME_DIR)
  message(FATAL_ERROR "JAVA_HOME is not set")
endif()
if(APPLE)
  set(JNI_PLATFORM_DIR darwin)
elseif(WIN32)
  set(JNI_PLATFORM_DIR win32)
else()
  set(JNI_PLATFORM_DIR linux)
endif()
set(JNI_INCLUDE_DIRS ${JAVA_HOME_DIR}/include ${JAVA_HOME_DIR}/include/${JNI_PLATFORM_DIR})
message(STATUS "simdjson_jni JNI headers: ${JNI_INCLUDE_DIRS}")

add_library(simdjson_jni SHARED
  ${CMAKE_CURRENT_SOURCE_DIR}/native/simdjson_jni.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/third_party/simdjson.cpp)

target_include_directories(simdjson_jni PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}/third_party
  ${JNI_INCLUDE_DIRS})

target_compile_options(simdjson_jni PRIVATE -O3 ${TUNE_FLAG} -fno-omit-frame-pointer -Wall)

set_target_properties(simdjson_jni PROPERTIES
  LIBRARY_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/build)

add_custom_target(tuning_flag_report ALL
  COMMAND ${CMAKE_COMMAND} -E echo "${TUNE_FLAG}" > ${CMAKE_CURRENT_SOURCE_DIR}/build/tuning_flag.txt)
