import { useEffect, useState } from "react";
import { loadAdFree } from "@/lib/ads";

/**
 * 広告を出さない状態か（有料プラン加入者）を読む。
 *
 * **初期値を true にしてある**のは、読み込みが終わる前の一瞬だけ広告が見えて
 * すぐ消える「チラつき」を防ぐため。加入者にとって、一瞬でも広告が出るのは
 * 支払った意味が無い体験になる。判定が付くまでは出さない側に倒す。
 *
 * 課金そのものは未実装（lib/ads.ts の loadAdFree を参照）。
 * 購入状態の判定を入れるときも、変えるのは loadAdFree の中だけでよい。
 */
export function useAdFree(): boolean {
  const [adFree, setAdFree] = useState(true);
  useEffect(() => {
    let alive = true;
    loadAdFree()
      .then((v) => {
        if (alive) setAdFree(v);
      })
      .catch(() => {
        if (alive) setAdFree(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  return adFree;
}
