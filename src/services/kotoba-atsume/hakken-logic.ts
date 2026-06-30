import type { ClassifyResponse } from "./types";
import { isNgWord } from "./ng-words";
import { DICTIONARY_WORDS } from "./dictionary-words";

export interface ClassifyInput {
  word: string;
  collected: string[];
  prepared: string[];
  ngList?: string[];
}

export interface RandomInput {
  n: number;
  collected: string[];
  prepared: string[];
}

export type RandomMode = "normal" | "review" | "exhausted";

export function classifyWord({ word, collected, prepared, ngList }: ClassifyInput): ClassifyResponse {
  const effectiveNgList = ngList ?? [];

  if (effectiveNgList.some(ng => word.includes(ng)) || (ngList === undefined && isNgWord(word))) {
    return { status: 'ng', message: 'この ことばは つかえないよ' };
  }
  if (DICTIONARY_WORDS.includes(word)) {
    return { status: 'dict', message: 'じしょに あり・むりょう' };
  }
  if (collected.includes(word)) {
    return { status: 'rediscovery', message: 'もういちど はっけん！' };
  }
  if (prepared.includes(word)) {
    return { status: 'prepared', message: 'もう しこみずみ' };
  }
  return { status: 'ok', message: 'はっけんOK' };
}

export function getRandomWords({ n, collected, prepared }: RandomInput): { words: string[]; mode: RandomMode } {
  const collectedSet = new Set(collected);
  const uncollectedPrepared = prepared.filter(w => !collectedSet.has(w));
  const shuffledPrepared = [...uncollectedPrepared].sort(() => Math.random() - 0.5);

  if (shuffledPrepared.length >= n) {
    return { words: shuffledPrepared.slice(0, n), mode: "normal" };
  }

  const result = shuffledPrepared.slice();

  if (result.length < n && collected.length > 0) {
    const reviewPool = [...collected].sort(() => Math.random() - 0.5);
    const needed = n - result.length;
    result.push(...reviewPool.slice(0, needed));
    return { words: result, mode: shuffledPrepared.length === 0 ? "review" : "normal" };
  }

  if (result.length > 0) {
    return { words: result, mode: "normal" };
  }

  return { words: [], mode: "exhausted" };
}
