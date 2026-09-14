#include <jni.h>

#include <cstdint>
#include <cstring>
#include <limits>
#include <stdexcept>
#include <string>
#include <string_view>
#include <utility>

#include "simdjson.h"

namespace {

constexpr uint64_t kSeed = 0xcbf29ce484222325ULL;
constexpr uint64_t kPrime = 0x100000001b3ULL;

constexpr uint64_t kTagObjectBegin = 1;
constexpr uint64_t kTagObjectEnd = 2;
constexpr uint64_t kTagArrayBegin = 3;
constexpr uint64_t kTagArrayEnd = 4;
constexpr uint64_t kTagKey = 5;
constexpr uint64_t kTagString = 6;
constexpr uint64_t kTagInt = 7;
constexpr uint64_t kTagDouble = 8;
constexpr uint64_t kTagBoolean = 9;
constexpr uint64_t kTagNull = 10;
constexpr uint64_t kTagDocumentEnd = 11;

constexpr size_t kStreamBatchSize = 1u << 20;
constexpr int32_t kListingRecordBytes = 48;
constexpr int32_t kMissingInt = INT32_MIN;

const char* const kExceptionClass = "dev/yll/simdjsonjni/SimdJsonException";

thread_local simdjson::ondemand::parser tl_parser;

inline uint64_t Mix(uint64_t accumulator, uint64_t value) {
  return (accumulator ^ value) * kPrime;
}

inline uint64_t DoubleBits(double value) {
  uint64_t bits;
  std::memcpy(&bits, &value, sizeof(bits));
  return bits;
}

void ThrowSimdJsonException(JNIEnv* env, const std::string& message) {
  if (env->ExceptionCheck()) {
    return;
  }
  jclass clazz = env->FindClass(kExceptionClass);
  if (clazz == nullptr) {
    return;
  }
  env->ThrowNew(clazz, message.c_str());
  env->DeleteLocalRef(clazz);
}

void WalkValue(simdjson::ondemand::value value, uint64_t& accumulator);

void WalkArray(simdjson::ondemand::array array, uint64_t& accumulator) {
  accumulator = Mix(accumulator, kTagArrayBegin);
  for (auto element : array) {
    simdjson::ondemand::value child = element.value();
    WalkValue(child, accumulator);
  }
  accumulator = Mix(accumulator, kTagArrayEnd);
}

void WalkObject(simdjson::ondemand::object object, uint64_t& accumulator) {
  accumulator = Mix(accumulator, kTagObjectBegin);
  for (auto field : object) {
    std::string_view key = field.unescaped_key();
    accumulator = Mix(accumulator, kTagKey);
    accumulator = Mix(accumulator, static_cast<uint64_t>(key.size()));
    simdjson::ondemand::value child = field.value();
    WalkValue(child, accumulator);
  }
  accumulator = Mix(accumulator, kTagObjectEnd);
}

void WalkScalar(simdjson::ondemand::value value, simdjson::ondemand::json_type type,
                uint64_t& accumulator) {
  switch (type) {
    case simdjson::ondemand::json_type::number: {
      simdjson::ondemand::number parsed = value.get_number();
      if (parsed.is_int64()) {
        accumulator = Mix(accumulator, kTagInt);
        accumulator = Mix(accumulator, static_cast<uint64_t>(parsed.get_int64()));
      } else if (parsed.is_uint64()) {
        accumulator = Mix(accumulator, kTagDouble);
        accumulator =
            Mix(accumulator, DoubleBits(static_cast<double>(parsed.get_uint64())));
      } else {
        accumulator = Mix(accumulator, kTagDouble);
        accumulator = Mix(accumulator, DoubleBits(parsed.get_double()));
      }
      break;
    }
    case simdjson::ondemand::json_type::string: {
      std::string_view text = value.get_string();
      accumulator = Mix(accumulator, kTagString);
      accumulator = Mix(accumulator, static_cast<uint64_t>(text.size()));
      break;
    }
    case simdjson::ondemand::json_type::boolean: {
      bool flag = value.get_bool();
      accumulator = Mix(accumulator, kTagBoolean);
      accumulator = Mix(accumulator, flag ? 1ULL : 0ULL);
      break;
    }
    case simdjson::ondemand::json_type::null: {
      if (!value.is_null()) {
        throw simdjson::simdjson_error(simdjson::INCORRECT_TYPE);
      }
      accumulator = Mix(accumulator, kTagNull);
      break;
    }
    default:
      throw simdjson::simdjson_error(simdjson::INCORRECT_TYPE);
  }
}

void WalkValue(simdjson::ondemand::value value, uint64_t& accumulator) {
  simdjson::ondemand::json_type type = value.type();
  if (type == simdjson::ondemand::json_type::array) {
    WalkArray(value.get_array(), accumulator);
  } else if (type == simdjson::ondemand::json_type::object) {
    WalkObject(value.get_object(), accumulator);
  } else {
    WalkScalar(value, type, accumulator);
  }
}

template <typename Document>
void WalkDocument(Document& document, uint64_t& accumulator) {
  simdjson::ondemand::json_type type = document.type();
  if (type == simdjson::ondemand::json_type::array) {
    WalkArray(document.get_array(), accumulator);
  } else if (type == simdjson::ondemand::json_type::object) {
    WalkObject(document.get_object(), accumulator);
  } else {
    simdjson::ondemand::value root = document.get_value();
    WalkScalar(root, type, accumulator);
  }
}

uint64_t ChecksumBuffer(const uint8_t* data, size_t length) {
  simdjson::padded_string_view view(reinterpret_cast<const char*>(data), length,
                                    length + simdjson::SIMDJSON_PADDING);
  simdjson::ondemand::document document = tl_parser.iterate(view);
  uint64_t accumulator = kSeed;
  WalkDocument(document, accumulator);
  return accumulator;
}

uint64_t ChecksumStreamBuffer(const uint8_t* data, size_t length) {
  simdjson::ondemand::document_stream stream =
      tl_parser.iterate_many(data, length, kStreamBatchSize);
  uint64_t accumulator = kSeed;
  for (auto item : stream) {
    simdjson::ondemand::document_reference document = std::move(item);
    WalkDocument(document, accumulator);
    accumulator = Mix(accumulator, kTagDocumentEnd);
  }
  return accumulator;
}

uint64_t CountDocumentsBuffer(const uint8_t* data, size_t length) {
  simdjson::ondemand::document_stream stream =
      tl_parser.iterate_many(data, length, kStreamBatchSize);
  uint64_t count = 0;
  for (auto item : stream) {
    simdjson::ondemand::document_reference document = std::move(item);
    if (document.type() == simdjson::ondemand::json_type::object) {
      count++;
    }
  }
  return count;
}

void WriteInt32(uint8_t* destination, int32_t value) {
  std::memcpy(destination, &value, sizeof(value));
}

void WriteDouble(uint8_t* destination, double value) {
  std::memcpy(destination, &value, sizeof(value));
}

int32_t TakeInt(simdjson::ondemand::object& record, std::string_view key) {
  auto result = record[key];
  if (result.error() != simdjson::SUCCESS) {
    return kMissingInt;
  }
  simdjson::ondemand::value value = result.value_unsafe();
  if (value.type() != simdjson::ondemand::json_type::number) {
    return kMissingInt;
  }
  return static_cast<int32_t>(value.get_int64());
}

double TakeDouble(simdjson::ondemand::object& record, std::string_view key) {
  auto result = record[key];
  if (result.error() != simdjson::SUCCESS) {
    return std::numeric_limits<double>::quiet_NaN();
  }
  simdjson::ondemand::value value = result.value_unsafe();
  if (value.type() != simdjson::ondemand::json_type::number) {
    return std::numeric_limits<double>::quiet_NaN();
  }
  return value.get_double();
}

std::string_view TakeString(simdjson::ondemand::object& record, std::string_view key) {
  auto result = record[key];
  if (result.error() != simdjson::SUCCESS) {
    return std::string_view();
  }
  simdjson::ondemand::value value = result.value_unsafe();
  if (value.type() != simdjson::ondemand::json_type::string) {
    return std::string_view();
  }
  return value.get_string();
}

int32_t AppendString(uint8_t* arena, int32_t arena_capacity, int32_t& arena_used,
                     std::string_view text) {
  int32_t length = static_cast<int32_t>(text.size());
  if (arena_used + length > arena_capacity) {
    throw std::runtime_error("listing string arena overflow");
  }
  std::memcpy(arena + arena_used, text.data(), static_cast<size_t>(length));
  int32_t offset = arena_used;
  arena_used += length;
  return offset;
}

int32_t ExtractListings(const uint8_t* input, size_t input_length, uint8_t* records,
                        int32_t record_capacity, uint8_t* arena, int32_t arena_capacity) {
  simdjson::ondemand::document_stream stream =
      tl_parser.iterate_many(input, input_length, kStreamBatchSize);
  int32_t count = 0;
  int32_t arena_used = 0;
  for (auto item : stream) {
    if ((count + 1) * kListingRecordBytes > record_capacity) {
      throw std::runtime_error("listing record buffer overflow");
    }
    simdjson::ondemand::document_reference document = std::move(item);
    simdjson::ondemand::object record = document.get_object();
    uint8_t* slot = records + static_cast<size_t>(count) * kListingRecordBytes;

    std::string_view make = TakeString(record, "make");
    std::string_view model = TakeString(record, "model");
    int32_t year = TakeInt(record, "year");
    int32_t city = TakeInt(record, "city08");
    int32_t highway = TakeInt(record, "highway08");
    int32_t combined = TakeInt(record, "comb08");
    double co2 = TakeDouble(record, "co2TailpipeGpm");
    std::string_view fuel = TakeString(record, "fuelType");

    int32_t make_offset = AppendString(arena, arena_capacity, arena_used, make);
    int32_t model_offset = AppendString(arena, arena_capacity, arena_used, model);
    int32_t fuel_offset = AppendString(arena, arena_capacity, arena_used, fuel);

    WriteInt32(slot + 0, year);
    WriteInt32(slot + 4, city);
    WriteInt32(slot + 8, highway);
    WriteInt32(slot + 12, combined);
    WriteDouble(slot + 16, co2);
    WriteInt32(slot + 24, make_offset);
    WriteInt32(slot + 28, static_cast<int32_t>(make.size()));
    WriteInt32(slot + 32, model_offset);
    WriteInt32(slot + 36, static_cast<int32_t>(model.size()));
    WriteInt32(slot + 40, fuel_offset);
    WriteInt32(slot + 44, static_cast<int32_t>(fuel.size()));
    count++;
  }
  return count;
}

const uint8_t* DirectAddress(JNIEnv* env, jobject buffer, jint length) {
  void* address = env->GetDirectBufferAddress(buffer);
  if (address == nullptr) {
    ThrowSimdJsonException(env, "buffer is not a direct ByteBuffer");
    return nullptr;
  }
  jlong capacity = env->GetDirectBufferCapacity(buffer);
  if (capacity < static_cast<jlong>(length) + simdjson::SIMDJSON_PADDING) {
    ThrowSimdJsonException(env, "direct buffer lacks SIMDJSON_PADDING slack");
    return nullptr;
  }
  return static_cast<const uint8_t*>(address);
}

}

extern "C" {

JNIEXPORT jint JNICALL Java_dev_yll_simdjsonjni_SimdJson_padding(JNIEnv*, jclass) {
  return static_cast<jint>(simdjson::SIMDJSON_PADDING);
}

JNIEXPORT jstring JNICALL Java_dev_yll_simdjsonjni_SimdJson_version(JNIEnv* env, jclass) {
  return env->NewStringUTF(SIMDJSON_VERSION);
}

JNIEXPORT jstring JNICALL
Java_dev_yll_simdjsonjni_SimdJson_activeImplementation(JNIEnv* env, jclass) {
  std::string name = simdjson::get_active_implementation()->name();
  std::string description = simdjson::get_active_implementation()->description();
  return env->NewStringUTF((name + " (" + description + ")").c_str());
}

JNIEXPORT void JNICALL Java_dev_yll_simdjsonjni_SimdJson_noop(JNIEnv*, jclass) {}

JNIEXPORT jlong JNICALL Java_dev_yll_simdjsonjni_SimdJson_touchDirect(JNIEnv* env, jclass,
                                                                     jobject buffer,
                                                                     jint length) {
  const uint8_t* data = DirectAddress(env, buffer, length);
  if (data == nullptr) {
    return 0;
  }
  return static_cast<jlong>(data[0]) + static_cast<jlong>(data[length - 1]);
}

JNIEXPORT jlong JNICALL Java_dev_yll_simdjsonjni_SimdJson_touchArray(JNIEnv* env, jclass,
                                                                    jbyteArray buffer,
                                                                    jint length) {
  jbyte* data = env->GetByteArrayElements(buffer, nullptr);
  if (data == nullptr) {
    ThrowSimdJsonException(env, "GetByteArrayElements returned null");
    return 0;
  }
  jlong result = static_cast<jlong>(static_cast<uint8_t>(data[0])) +
                 static_cast<jlong>(static_cast<uint8_t>(data[length - 1]));
  env->ReleaseByteArrayElements(buffer, data, JNI_ABORT);
  return result;
}

JNIEXPORT jboolean JNICALL
Java_dev_yll_simdjsonjni_SimdJson_byteArrayIsCopy(JNIEnv* env, jclass, jbyteArray buffer) {
  jboolean is_copy = JNI_FALSE;
  jbyte* data = env->GetByteArrayElements(buffer, &is_copy);
  if (data == nullptr) {
    ThrowSimdJsonException(env, "GetByteArrayElements returned null");
    return JNI_FALSE;
  }
  env->ReleaseByteArrayElements(buffer, data, JNI_ABORT);
  return is_copy;
}

JNIEXPORT jlong JNICALL Java_dev_yll_simdjsonjni_SimdJson_checksumDirect(JNIEnv* env, jclass,
                                                                        jobject buffer,
                                                                        jint length) {
  const uint8_t* data = DirectAddress(env, buffer, length);
  if (data == nullptr) {
    return 0;
  }
  try {
    return static_cast<jlong>(ChecksumBuffer(data, static_cast<size_t>(length)));
  } catch (const std::exception& error) {
    ThrowSimdJsonException(env, error.what());
    return 0;
  }
}

JNIEXPORT jlong JNICALL Java_dev_yll_simdjsonjni_SimdJson_checksumArray(JNIEnv* env, jclass,
                                                                       jbyteArray buffer,
                                                                       jint length) {
  jsize capacity = env->GetArrayLength(buffer);
  if (capacity < length + static_cast<jsize>(simdjson::SIMDJSON_PADDING)) {
    ThrowSimdJsonException(env, "byte[] lacks SIMDJSON_PADDING slack");
    return 0;
  }
  jbyte* data = env->GetByteArrayElements(buffer, nullptr);
  if (data == nullptr) {
    ThrowSimdJsonException(env, "GetByteArrayElements returned null");
    return 0;
  }
  jlong result = 0;
  try {
    result = static_cast<jlong>(
        ChecksumBuffer(reinterpret_cast<const uint8_t*>(data), static_cast<size_t>(length)));
    env->ReleaseByteArrayElements(buffer, data, JNI_ABORT);
  } catch (const std::exception& error) {
    env->ReleaseByteArrayElements(buffer, data, JNI_ABORT);
    ThrowSimdJsonException(env, error.what());
    return 0;
  }
  return result;
}

JNIEXPORT jlong JNICALL Java_dev_yll_simdjsonjni_SimdJson_checksumStreamDirect(
    JNIEnv* env, jclass, jobject buffer, jint length) {
  const uint8_t* data = DirectAddress(env, buffer, length);
  if (data == nullptr) {
    return 0;
  }
  try {
    return static_cast<jlong>(ChecksumStreamBuffer(data, static_cast<size_t>(length)));
  } catch (const std::exception& error) {
    ThrowSimdJsonException(env, error.what());
    return 0;
  }
}

JNIEXPORT jlong JNICALL Java_dev_yll_simdjsonjni_SimdJson_checksumStreamArray(
    JNIEnv* env, jclass, jbyteArray buffer, jint length) {
  jsize capacity = env->GetArrayLength(buffer);
  if (capacity < length + static_cast<jsize>(simdjson::SIMDJSON_PADDING)) {
    ThrowSimdJsonException(env, "byte[] lacks SIMDJSON_PADDING slack");
    return 0;
  }
  jbyte* data = env->GetByteArrayElements(buffer, nullptr);
  if (data == nullptr) {
    ThrowSimdJsonException(env, "GetByteArrayElements returned null");
    return 0;
  }
  jlong result = 0;
  try {
    result = static_cast<jlong>(ChecksumStreamBuffer(reinterpret_cast<const uint8_t*>(data),
                                                     static_cast<size_t>(length)));
    env->ReleaseByteArrayElements(buffer, data, JNI_ABORT);
  } catch (const std::exception& error) {
    env->ReleaseByteArrayElements(buffer, data, JNI_ABORT);
    ThrowSimdJsonException(env, error.what());
    return 0;
  }
  return result;
}

JNIEXPORT jlong JNICALL Java_dev_yll_simdjsonjni_SimdJson_countDocumentsDirect(
    JNIEnv* env, jclass, jobject buffer, jint length) {
  const uint8_t* data = DirectAddress(env, buffer, length);
  if (data == nullptr) {
    return 0;
  }
  try {
    return static_cast<jlong>(CountDocumentsBuffer(data, static_cast<size_t>(length)));
  } catch (const std::exception& error) {
    ThrowSimdJsonException(env, error.what());
    return 0;
  }
}

JNIEXPORT jint JNICALL Java_dev_yll_simdjsonjni_SimdJson_extractListingsDirect(
    JNIEnv* env, jclass, jobject input, jint input_length, jobject records,
    jint record_capacity, jobject strings, jint string_capacity) {
  const uint8_t* input_data = DirectAddress(env, input, input_length);
  if (input_data == nullptr) {
    return 0;
  }
  void* record_data = env->GetDirectBufferAddress(records);
  void* string_data = env->GetDirectBufferAddress(strings);
  if (record_data == nullptr || string_data == nullptr) {
    ThrowSimdJsonException(env, "output buffers must be direct ByteBuffers");
    return 0;
  }
  try {
    return ExtractListings(input_data, static_cast<size_t>(input_length),
                           static_cast<uint8_t*>(record_data), record_capacity,
                           static_cast<uint8_t*>(string_data), string_capacity);
  } catch (const std::exception& error) {
    ThrowSimdJsonException(env, error.what());
    return 0;
  }
}

}
