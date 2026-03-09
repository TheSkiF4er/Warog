import { batch, derive, signal, watch } from "@warog/core";

const count = signal(0);
const doubled = derive(() => count.get() * 2);

const stop = watch(() => {
  console.log(`count=${count.get()} doubled=${doubled.get()}`);
});

batch(() => {
  count.set(1);
  count.update((value) => value + 1);
});

stop();
