import assert from "node:assert/strict";

function run(name: string, fn: () => Promise<void> | void) {
  Promise.resolve(fn()).then(() => {
    console.log(`ok - ${name}`);
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

run("calls markdown and transcript export APIs", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const requests: Array<{ url: string; options?: RequestInit }> = [];

  globalThis.window = { location: { origin: "http://127.0.0.1:3838" } } as typeof window;
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    requests.push({ url: String(url), options });
    const isTranscript = String(url).includes("/exports/transcript");
    return new Response(JSON.stringify({
      task_id: "task-1",
      target_format: isTranscript ? "transcript" : "obsidian",
      path: isTranscript ? "C:/vault/transcript.txt" : "C:/vault/note.md",
      directory: "C:/vault",
      file_name: isTranscript ? "transcript.txt" : "note.md",
      overwritten: false,
      artifact_key: isTranscript ? "transcript_export_path" : "obsidian_note_path",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const { api } = await import("../src/api.ts");
  const response = await api.exportTaskMarkdown("task-1", {
    target: "obsidian",
    include_transcript: true,
    output_dir: "C:/picked",
  });

  assert.equal(response.target_format, "obsidian");
  assert.equal(requests[0]?.url, "/api/v1/tasks/task-1/exports/markdown");
  assert.equal(requests[0]?.options?.method, "POST");
  const markdownBody = JSON.parse(String(requests[0]?.options?.body));
  assert.equal(markdownBody.target, "obsidian");
  assert.equal(markdownBody.include_transcript, true);
  assert.equal(markdownBody.output_dir, "C:/picked");

  const transcriptResponse = await api.exportTaskTranscript("task-1", { output_dir: "C:/picked" });

  assert.equal(transcriptResponse.target_format, "transcript");
  assert.equal(requests[1]?.url, "/api/v1/tasks/task-1/exports/transcript");
  assert.equal(requests[1]?.options?.method, "POST");
  const transcriptBody = JSON.parse(String(requests[1]?.options?.body));
  assert.equal(transcriptBody.output_dir, "C:/picked");

  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});
