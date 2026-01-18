import { useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

import BotIcon from "./icons/BotIcon";
import BrainIcon from "./icons/BrainIcon";
import UserIcon from "./icons/UserIcon";

import { MathJaxContext, MathJax } from "better-react-mathjax";
import "./Chat.css";

function render(text) {
  // Replace all instances of single backslashes before brackets with double backslashes
  // See https://github.com/markedjs/marked/issues/546 for more information.
  text = text.replace(/\\([\[\]\(\)])/g, "\\\\$1");

  const result = DOMPurify.sanitize(
    marked.parse(text, {
      async: false,
      breaks: true,
    }),
  );
  return result;
}
function Message({ role, content, answerIndex }) {
  const thinking = answerIndex ? content.slice(0, answerIndex) : content;
  const answer = answerIndex ? content.slice(answerIndex) : "";

  const [showThinking, setShowThinking] = useState(false);

  const doneThinking = answer.length > 0;

  return (
    <div className="flex items-start space-x-4">
      {role === "assistant" ? (
        <>
          <BotIcon className="h-6 w-6 min-h-6 min-w-6 my-3 text-[#00ff41]" style={{ filter: 'drop-shadow(0 0 5px rgba(0,255,65,0.5))' }} />
          <div
            className="bg-[#0d1117] border border-[#00cc33] rounded-lg p-4"
            style={{ boxShadow: '0 0 15px rgba(0,255,65,0.1), inset 0 0 20px rgba(0,255,65,0.02)' }}
          >
            <div className="min-h-6 text-[#00ff41] overflow-wrap-anywhere font-mono">
              {thinking.length > 0 ? (
                <>
                  <div className="bg-[#030308] border border-[#00cc33]/50 rounded-lg flex flex-col">
                    <button
                      className="flex items-center gap-2 cursor-pointer p-4 hover:bg-[#00ff41]/5 rounded-lg transition-all duration-300"
                      onClick={() => setShowThinking((prev) => !prev)}
                      style={{ width: showThinking ? "100%" : "auto" }}
                    >
                      <BrainIcon
                        className={doneThinking ? "text-[#00d4ff]" : "animate-pulse text-[#00d4ff]"}
                        style={{ filter: 'drop-shadow(0 0 5px rgba(0,212,255,0.5))' }}
                      />
                      <span className="text-[#00d4ff]">
                        {doneThinking ? "> View reasoning process" : "> Processing..."}
                      </span>
                      <span className="ml-auto text-[#00cc33]">
                        {showThinking ? "[-]" : "[+]"}
                      </span>
                    </button>
                    {showThinking && (
                      <MathJax
                        className="border-t border-[#00cc33]/30 px-4 py-2"
                        dynamic
                      >
                        <span
                          className="markdown text-[#00cc33]"
                          dangerouslySetInnerHTML={{
                            __html: render(thinking),
                          }}
                        />
                      </MathJax>
                    )}
                  </div>
                  {doneThinking && (
                    <MathJax className="mt-2" dynamic>
                      <span
                        className="markdown"
                        dangerouslySetInnerHTML={{
                          __html: render(answer),
                        }}
                      />
                    </MathJax>
                  )}
                </>
              ) : (
                <span className="h-6 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-[#00ff41] rounded-full animate-pulse" style={{ boxShadow: '0 0 10px rgba(0,255,65,0.6)' }}></span>
                  <span className="w-2.5 h-2.5 bg-[#00ff41] rounded-full animate-pulse animation-delay-200" style={{ boxShadow: '0 0 10px rgba(0,255,65,0.6)' }}></span>
                  <span className="w-2.5 h-2.5 bg-[#00ff41] rounded-full animate-pulse animation-delay-400" style={{ boxShadow: '0 0 10px rgba(0,255,65,0.6)' }}></span>
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <UserIcon className="h-6 w-6 min-h-6 min-w-6 my-3 text-[#00d4ff]" style={{ filter: 'drop-shadow(0 0 5px rgba(0,212,255,0.5))' }} />
          <div
            className="bg-[#00d4ff]/10 border border-[#00d4ff] text-[#00d4ff] rounded-lg p-4 font-mono"
            style={{ boxShadow: '0 0 15px rgba(0,212,255,0.2)' }}
          >
            <p className="min-h-6 overflow-wrap-anywhere">
              <span className="text-[#00ff41]">{"> "}</span>{content}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function Chat({ messages }) {
  const empty = messages.length === 0;

  return (
    <div
      className={`flex-1 p-6 max-w-[960px] w-full ${empty ? "flex flex-col items-center justify-end" : "space-y-4"}`}
    >
      <MathJaxContext>
        {empty ? (
          <div
            className="text-xl text-[#00ff41] font-mono"
            style={{ textShadow: '0 0 10px rgba(0,255,65,0.6)' }}
          >
            {"> "}SYSTEM READY_
          </div>
        ) : (
          messages.map((msg, i) => <Message key={`message-${i}`} {...msg} />)
        )}
      </MathJaxContext>
    </div>
  );
}
