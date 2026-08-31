export type IdeaInputType = "text" | "voice" | "camera" | "file";

export type IdeaLocation = {
  latitude?: number;
  longitude?: number;
  label?: string;
  source?: "device" | "extracted" | "manual";
};

export type IdeaAttachment = {
  id: string;
  type: "image" | "file" | "audio";
  name?: string;
  url?: string;
};

export type IdeaEnrichment = {
  summary?: string;
  sourceUrls?: string[];
  confidence?: number;
  researchedAt?: string;
};

export type Idea = {
  id: string;
  originalInput: string;
  inputType: IdeaInputType;
  title: string;
  summary: string;
  createdAt: string;
  location?: IdeaLocation;
  attachments: IdeaAttachment[];
  tags: string[];
  people: string[];
  enrichment?: IdeaEnrichment;
};
