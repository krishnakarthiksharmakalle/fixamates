
export type AssistantMode = "repair" | "cooking";

export type AssistantInput = {
  mode: AssistantMode;
  text: string;
  images?: File[];
  audio?: Blob | null;
};

export async function sendToAssistant(
  input: AssistantInput
) {
  const formData = new FormData();

  formData.append("mode", input.mode);
  formData.append("text", input.text);

  for (const image of input.images ?? []) {
    formData.append("images", image, image.name);
  }

  if (input.audio && input.audio.size > 0) {
    formData.append("audio", input.audio, "voice.webm");
  }

  const response = await fetch("/api/assistant", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed: ${response.status}`
    );
  }

  return data;
}