import { MultiGraph } from 'graphology';
import { arrangeNetwork } from './network-layout';
self.onmessage = (event: MessageEvent<ReturnType<MultiGraph['export']>>) => {
  const graph = new MultiGraph({ allowSelfLoops: false });
  graph.import(event.data);
  self.postMessage(arrangeNetwork(graph));
};
