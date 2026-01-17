import { useEffect, useState, useRef } from "react";

import Chat from "./components/Chat";
import ArrowRightIcon from "./components/icons/ArrowRightIcon";
import StopIcon from "./components/icons/StopIcon";
import Progress from "./components/Progress";

const IS_WEBGPU_AVAILABLE = !!navigator.gpu;
const STICKY_SCROLL_THRESHOLD = 120;
const EXAMPLES = [
  "Solve the equation x^2 - 3x + 2 = 0",
  "Lily is three times older than her son. In 15 years, she will be twice as old as him. How old is she now?",
  "Write python code to compute the nth fibonacci number.",
];

function App() {
  // Create a reference to the worker object.
  const worker = useRef(null);

  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Model loading and progress
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // Inputs and outputs
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [tps, setTps] = useState(null);
  const [numTokens, setNumTokens] = useState(null);

  function onEnter(message) {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setTps(null);
    setIsRunning(true);
    setInput("");
  }

  function onInterrupt() {
    // NOTE: We do not set isRunning to false here because the worker
    // will send a 'complete' message when it is done.
    worker.current.postMessage({ type: "interrupt" });
  }

  useEffect(() => {
    resizeInput();
  }, [input]);

  function resizeInput() {
    if (!textareaRef.current) return;

    const target = textareaRef.current;
    target.style.height = "auto";
    const newHeight = Math.min(Math.max(target.scrollHeight, 24), 200);
    target.style.height = `${newHeight}px`;
  }

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    // Create the worker if it does not yet exist.
    if (!worker.current) {
      worker.current = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
      });
      worker.current.postMessage({ type: "check" }); // Do a feature check
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case "loading":
          // Model file start load: add a new progress item to the list.
          setStatus("loading");
          setLoadingMessage(e.data.data);
          break;

        case "initiate":
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data };
              }
              return item;
            }),
          );
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file),
          );
          break;

        case "ready":
          // Pipeline ready: the worker is ready to accept messages.
          setStatus("ready");
          break;

        case "start":
          {
            // Start generation
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "" },
            ]);
          }
          break;

        case "update":
          {
            // Generation update: update the output text.
            // Parse messages
            const { output, tps, numTokens, state } = e.data;
            setTps(tps);
            setNumTokens(numTokens);
            setMessages((prev) => {
              const cloned = [...prev];
              const last = cloned.at(-1);
              const data = {
                ...last,
                content: last.content + output,
              };
              if (data.answerIndex === undefined && state === "answering") {
                // When state changes to answering, we set the answerIndex
                data.answerIndex = last.content.length;
              }
              cloned[cloned.length - 1] = data;
              return cloned;
            });
          }
          break;

        case "complete":
          // Generation complete: re-enable the "Generate" button
          setIsRunning(false);
          break;

        case "error":
          setError(e.data.data);
          break;
      }
    };

    const onErrorReceived = (e) => {
      console.error("Worker error:", e);
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);
    worker.current.addEventListener("error", onErrorReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => {
      worker.current.removeEventListener("message", onMessageReceived);
      worker.current.removeEventListener("error", onErrorReceived);
    };
  }, []);

  // Send the messages to the worker thread whenever the `messages` state changes.
  useEffect(() => {
    if (messages.filter((x) => x.role === "user").length === 0) {
      // No user messages yet: do nothing.
      return;
    }
    if (messages.at(-1).role === "assistant") {
      // Do not update if the last message is from the assistant
      return;
    }
    setTps(null);
    worker.current.postMessage({ type: "generate", data: messages });
  }, [messages, isRunning]);

  useEffect(() => {
    if (!chatContainerRef.current || !isRunning) return;
    const element = chatContainerRef.current;
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight <
      STICKY_SCROLL_THRESHOLD
    ) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, isRunning]);

  return IS_WEBGPU_AVAILABLE ? (
    <div className="flex flex-col h-screen mx-auto items justify-end bg-[#030308] text-[#00ff41]">
      {status === null && messages.length === 0 && (
        <div className="h-full overflow-auto scrollbar-thin flex justify-center items-center flex-col relative">
          <div className="flex flex-col items-center mb-1 max-w-[400px] text-center">
            <img
              src="logo.png"
              width="80%"
              height="auto"
              className="block drop-shadow-lg bg-transparent"
              style={{ filter: 'hue-rotate(90deg) saturate(2) brightness(1.2)' }}
            ></img>
            <h1 className="text-4xl font-bold mb-1 text-[#00ff41]" style={{ textShadow: '0 0 10px rgba(0,255,65,0.6), 0 0 20px rgba(0,255,65,0.4)' }}>
              DeepSeek-R1 WebGPU
            </h1>
            <h2 className="font-semibold text-[#00d4ff]" style={{ textShadow: '0 0 10px rgba(0,212,255,0.4)' }}>
              A next-generation reasoning model that runs locally in your
              browser with WebGPU acceleration.
            </h2>
          </div>

          <div className="flex flex-col items-center px-4">
            <p className="max-w-[510px] mb-4 text-[#00cc33]">
              <br />
              You are about to load{" "}
              <a
                href="https://huggingface.co/onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline text-[#00d4ff] hover:text-[#00ff41]"
              >
                DeepSeek-R1-Distill-Qwen-1.5B
              </a>
              , a 1.5B parameter reasoning LLM optimized for in-browser
              inference. Everything runs entirely in your browser with{" "}
              <a
                href="https://huggingface.co/docs/transformers.js"
                target="_blank"
                rel="noreferrer"
                className="underline text-[#00d4ff] hover:text-[#00ff41]"
              >
                Transformers.js
              </a>{" "}
              and ONNX Runtime Web, meaning no data is sent to a server. Once
              loaded, it can even be used offline. The source code for the demo
              is available on{" "}
              <a
                href="https://github.com/huggingface/transformers.js-examples/tree/main/deepseek-r1-webgpu"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline text-[#00d4ff] hover:text-[#00ff41]"
              >
                GitHub
              </a>
              .
            </p>

            {error && (
              <div className="text-[#ff3366] text-center mb-2 p-3 border border-[#ff3366] rounded-lg" style={{ boxShadow: '0 0 15px rgba(255,51,102,0.3)' }}>
                <p className="mb-1">
                  {"> "}ERROR: Unable to load model
                </p>
                <p className="text-sm font-mono">{error}</p>
              </div>
            )}

            <button
              className="border border-[#00ff41] px-6 py-3 rounded-lg bg-transparent text-[#00ff41] hover:bg-[#00ff41]/10 disabled:border-[#00cc33]/30 disabled:text-[#00cc33]/30 cursor-pointer disabled:cursor-not-allowed select-none font-mono uppercase tracking-wider transition-all duration-300"
              style={{
                boxShadow: status === null && error === null ? '0 0 15px rgba(0,255,65,0.3), inset 0 0 15px rgba(0,255,65,0.05)' : 'none',
                textShadow: status === null && error === null ? '0 0 10px rgba(0,255,65,0.6)' : 'none'
              }}
              onClick={() => {
                worker.current.postMessage({ type: "load" });
                setStatus("loading");
              }}
              disabled={status !== null || error !== null}
            >
              {"> "}Initialize Model
            </button>
          </div>
        </div>
      )}
      {status === "loading" && (
        <>
          <div className="w-full max-w-[500px] text-left mx-auto p-4 bottom-0 mt-auto">
            <p className="text-center mb-1 text-[#00d4ff] font-mono" style={{ textShadow: '0 0 10px rgba(0,212,255,0.4)' }}>
              {"> "}{loadingMessage}
            </p>
            {progressItems.map(({ file, progress, total }, i) => (
              <Progress
                key={i}
                text={file}
                percentage={progress}
                total={total}
              />
            ))}
          </div>
        </>
      )}

      {status === "ready" && (
        <div
          ref={chatContainerRef}
          className="overflow-y-auto scrollbar-thin w-full flex flex-col items-center h-full"
        >
          <Chat messages={messages} />
          {messages.length === 0 && (
            <div>
              {EXAMPLES.map((msg, i) => (
                <div
                  key={i}
                  className="m-1 border border-[#00cc33] rounded-md p-3 bg-[#0d1117] cursor-pointer hover:border-[#00ff41] hover:bg-[#00ff41]/5 transition-all duration-300 font-mono text-sm"
                  style={{ boxShadow: '0 0 10px rgba(0,255,65,0.1)' }}
                  onClick={() => onEnter(msg)}
                >
                  <span className="text-[#00d4ff]">{"> "}</span>{msg}
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-sm min-h-6 text-[#00cc33] font-mono">
            {tps && messages.length > 0 && (
              <>
                {!isRunning && (
                  <span>
                    Generated {numTokens} tokens in{" "}
                    {(numTokens / tps).toFixed(2)} seconds&nbsp;&#40;
                  </span>
                )}
                {
                  <>
                    <span className="font-medium text-center mr-1 text-[#00ff41]" style={{ textShadow: '0 0 10px rgba(0,255,65,0.6)' }}>
                      {tps.toFixed(2)}
                    </span>
                    <span className="text-[#00cc33]">
                      tokens/second
                    </span>
                  </>
                }
                {!isRunning && (
                  <>
                    <span className="mr-1">&#41;.</span>
                    <span
                      className="underline cursor-pointer text-[#00d4ff] hover:text-[#00ff41]"
                      onClick={() => {
                        worker.current.postMessage({ type: "reset" });
                        setMessages([]);
                      }}
                    >
                      Reset
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
      )}

      <div
        className="mt-2 border border-[#00cc33] rounded-lg w-[600px] max-w-[80%] max-h-[200px] mx-auto relative mb-3 flex bg-[#0d1117]"
        style={{ boxShadow: '0 0 20px rgba(0,255,65,0.1), inset 0 0 20px rgba(0,255,65,0.02)' }}
      >
        <textarea
          ref={textareaRef}
          className="scrollbar-thin w-[550px] bg-transparent px-3 py-4 rounded-lg border-none outline-hidden text-[#00ff41] disabled:text-[#00cc33]/30 placeholder-[#00cc33]/50 resize-none disabled:cursor-not-allowed font-mono"
          placeholder="> Enter your query..."
          type="text"
          rows={1}
          value={input}
          disabled={status !== "ready"}
          title={status === "ready" ? "Model is ready" : "Model not loaded yet"}
          onKeyDown={(e) => {
            if (
              input.length > 0 &&
              !isRunning &&
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault(); // Prevent default behavior of Enter key
              onEnter(input);
            }
          }}
          onInput={(e) => setInput(e.target.value)}
        />
        {isRunning ? (
          <div className="cursor-pointer" onClick={onInterrupt}>
            <StopIcon className="h-8 w-8 p-1 rounded-md text-[#ff3366] absolute right-3 bottom-3" style={{ filter: 'drop-shadow(0 0 5px rgba(255,51,102,0.5))' }} />
          </div>
        ) : input.length > 0 ? (
          <div className="cursor-pointer" onClick={() => onEnter(input)}>
            <ArrowRightIcon
              className="h-8 w-8 p-1 bg-[#00ff41] text-[#030308] rounded-md absolute right-3 bottom-3"
              style={{ boxShadow: '0 0 15px rgba(0,255,65,0.5)' }}
            />
          </div>
        ) : (
          <div>
            <ArrowRightIcon
              className="h-8 w-8 p-1 bg-[#00cc33]/20 text-[#00cc33]/50 rounded-md absolute right-3 bottom-3"
            />
          </div>
        )}
      </div>

      <p className="text-xs text-[#00cc33]/60 text-center mb-3 font-mono">
        {"> "}Disclaimer: Generated content may be inaccurate or false.
      </p>
    </div>
  ) : (
    <div className="fixed w-screen h-screen bg-[#030308] z-10 text-[#ff3366] text-2xl font-semibold flex justify-center items-center text-center font-mono" style={{ textShadow: '0 0 20px rgba(255,51,102,0.6)' }}>
      {"> "}ERROR: WebGPU is not supported
      <br />
      by this browser
    </div>
  );
}

export default App;
