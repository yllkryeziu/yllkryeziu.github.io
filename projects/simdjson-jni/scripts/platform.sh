resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" ]]; then
    echo "${JAVA_HOME}"
  elif [[ "$(uname -s)" == "Darwin" ]]; then
    /usr/libexec/java_home -v 21
  else
    dirname "$(dirname "$(readlink -f "$(command -v java)")")"
  fi
}

logical_cpus() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sysctl -n hw.logicalcpu
  else
    nproc
  fi
}

performance_cpus() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sysctl -n hw.perflevel0.logicalcpu
  else
    nproc
  fi
}

efficiency_cpus() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sysctl -n hw.perflevel1.logicalcpu 2>/dev/null || echo 0
  else
    echo 0
  fi
}

cpu_brand() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sysctl -n machdep.cpu.brand_string
  else
    awk -F': ' '/^model name/ { print $2; exit }' /proc/cpuinfo
  fi
}

os_build() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "$(uname -srm) $(sw_vers -productVersion) $(sw_vers -buildVersion)"
  else
    echo "$(uname -srm) $(sed -n 's/^PRETTY_NAME="\(.*\)"$/\1/p' /etc/os-release)"
  fi
}

native_library_path() {
  local build_dir="$1"
  if [[ -f "${build_dir}/libsimdjson_jni.dylib" ]]; then
    echo "${build_dir}/libsimdjson_jni.dylib"
  else
    echo "${build_dir}/libsimdjson_jni.so"
  fi
}

cxx_version() {
  if command -v clang++ >/dev/null 2>&1; then
    clang++ --version 2>&1 | sed -n 1p
  else
    "${CXX:-g++}" --version 2>&1 | sed -n 1p
  fi
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$@"
  else
    shasum -a 256 "$@"
  fi
}
