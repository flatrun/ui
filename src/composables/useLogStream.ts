import { ref, onUnmounted } from "vue";
import { deploymentLogsWsUrl } from "@/services/api";

// maxBufferedLines bounds what a follow keeps. A container that logs a line a millisecond
// would otherwise grow the buffer until the tab dies; the oldest lines go first, which is
// what a viewer scrolled to the bottom is not looking at anyway.
const maxBufferedLines = 5000;

/**
 * Follows a deployment's logs over a websocket, handing back the text as it arrives.
 *
 * A tail only ever says what was true when it was asked, so watching a container start means
 * asking again and again. Following gives the line when the container writes it.
 */
export function useLogStream() {
  const lines = ref<string[]>([]);
  const following = ref(false);
  const error = ref("");

  let socket: WebSocket | null = null;

  const stop = () => {
    following.value = false;
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
  };

  const start = (deployment: string, opts: { tail?: number; filter?: string } = {}) => {
    stop();
    lines.value = [];
    error.value = "";

    socket = new WebSocket(deploymentLogsWsUrl(deployment, opts));

    socket.onopen = () => {
      following.value = true;
      // A browser cannot set headers on a websocket, so the token goes as the first message,
      // the same way the terminal sends it.
      const token = localStorage.getItem("auth_token");
      if (token) socket?.send(JSON.stringify({ type: "auth", token }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "log") {
          lines.value.push(message.line);
          if (lines.value.length > maxBufferedLines) {
            lines.value = lines.value.slice(-maxBufferedLines);
          }
        } else if (message.type === "error") {
          error.value = message.error || message.message || "The log stream stopped";
          stop();
        }
      } catch {
        // A frame that is not JSON is not something this viewer can show.
      }
    };

    socket.onerror = () => {
      error.value = "Lost the connection to the log stream";
    };

    socket.onclose = () => {
      following.value = false;
      socket = null;
    };
  };

  onUnmounted(stop);

  return { lines, following, error, start, stop };
}
