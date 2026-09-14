import React from 'react';
import type { Reference } from './Article';

export const SIMD_REFS: Reference[] = [
  {
    n: 1,
    text: <>Langdale, G. and Lemire, D. <em>Parsing Gigabytes of JSON per Second</em>. The VLDB Journal 28, 2019.</>,
    url: 'https://arxiv.org/abs/1902.08318',
  },
  {
    n: 2,
    text: <>Keiser, J. and Lemire, D. <em>Validating UTF-8 In Less Than One Instruction Per Byte</em>. Software: Practice and Experience, 2021.</>,
    url: 'https://arxiv.org/abs/2010.03090',
  },
  {
    n: 3,
    text: <>simdjson contributors. <em>simdjson: Parsing gigabytes of JSON per second</em>. Version 4.6.11.</>,
    url: 'https://github.com/simdjson/simdjson',
  },
  {
    n: 4,
    text: <>Oracle. <em>Java Native Interface Specification, JDK 21</em>. See <code>GetDirectBufferAddress</code> and <code>GetByteArrayElements</code>.</>,
    url: 'https://docs.oracle.com/en/java/javase/21/docs/specs/jni/functions.html',
  },
  {
    n: 5,
    text: <>OpenJDK. <em>JMH: Java Microbenchmark Harness</em>. Version 1.37.</>,
    url: 'https://github.com/openjdk/jmh',
  },
  {
    n: 6,
    text: <>Shipilëv, A. <em>Nanotrusting the Nanotime</em>. 2014.</>,
    url: 'https://shipilev.net/blog/2014/nanotrusting-nanotime/',
  },
  {
    n: 7,
    text: <>FasterXML. <em>jackson-databind</em>. Version 2.18.2.</>,
    url: 'https://github.com/FasterXML/jackson-databind',
  },
  {
    n: 8,
    text: <>simdjson contributors. <em>simdjson-data</em>: the corpus of real-world JSON payloads used for parser benchmarking.</>,
    url: 'https://github.com/simdjson/simdjson-data',
  },
  {
    n: 9,
    text: <>U.S. Environmental Protection Agency and Department of Energy. <em>Fuel Economy Data</em>, downloadable vehicle dataset.</>,
    url: 'https://www.fueleconomy.gov/feg/download.shtml',
  },
];

export const SIMD_BIBTEX = `@article{kryeziu2025jni,
  title   = {What crossing the JNI boundary actually costs},
  author  = {Kryeziu, Yll},
  journal = {yllkryeziu.github.io},
  year    = {2025},
  month   = {October},
  url     = {https://yllkryeziu.github.io/#work/simd}
}`;
