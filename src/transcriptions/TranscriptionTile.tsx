import { ChatMessageType, ChatTile } from "@/components/chat/ChatTile";
import {
  TrackReferenceOrPlaceholder,
  useChat,
  useLocalParticipant,
  useTrackTranscription,
} from "@livekit/components-react";
import {
  LocalParticipant,
  Participant,
  Track,
  TranscriptionSegment,
} from "livekit-client";
import { useEffect, useState } from "react";

export function TranscriptionTile({
  agentAudioTrack,
  accentColor,
  onLastMessage,  // Callback prop for the parent

}: {
  agentAudioTrack: TrackReferenceOrPlaceholder;
  accentColor: string;
  onLastMessage: (value:any) => void;  // Callback function type
 
}) {
  const agentMessages = useTrackTranscription(agentAudioTrack);
  const localParticipant = useLocalParticipant();
  const localMessages = useTrackTranscription({
    publication: localParticipant.microphoneTrack,
    source: Track.Source.Microphone,
    participant: localParticipant.localParticipant,
  });

  const [transcripts, setTranscripts] = useState<Map<string, ChatMessageType>>(
    new Map()
  );
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [allMessage, setAllMessage] = useState<any>([]);

  const { chatMessages, send: sendChat } = useChat();
  useEffect(() => {
    if (allMessage && allMessage.length > 0) {
      const lastMessage = allMessage[allMessage.length - 1].message;
  
      // Define target phrases
      const targetPhrases = ['Goodbye!', 'All images have been described. Goodbye!'];
  
      // Check if the last message matches any target phrase
      if (
        targetPhrases.some(phrase => lastMessage.includes(phrase)) &&
        allMessage[allMessage.length - 1].name === 'Agent'
      ) {
        // Trigger callback with updated messages
        onLastMessage(true);
      }
    }
  }, [allMessage]);
  

let allMessages;
  useEffect(()=>{
console.log("messages", messages)
  },[messages])
  // store transcripts
  useEffect(() => {
    agentMessages.segments.forEach((s) =>
      transcripts.set(
        s.id,
        segmentToChatMessage(
          s,
          transcripts.get(s.id),
          agentAudioTrack.participant
        )
      )
    );
    localMessages.segments.forEach((s) =>
      transcripts.set(
        s.id,
        segmentToChatMessage(
          s,
          transcripts.get(s.id),
          localParticipant.localParticipant
        )
      )
    );
    console.log("Transcripts", transcripts)
    console.log("local messages", localMessages)
    console.log("agent messages", agentMessages)



    allMessages = Array.from(transcripts.values());
    setAllMessage(allMessages)
    console.log("allmessages", allMessages)
    console.log("chatmessages", chatMessages)
    console.log("transcript.valhes", transcripts.values())


    for (const msg of chatMessages) {
      const isAgent =
        msg.from?.identity === agentAudioTrack.participant?.identity;
      const isSelf =
        msg.from?.identity === localParticipant.localParticipant.identity;
      let name = msg.from?.name;
      if (!name) {
        if (isAgent) {
          name = "Agent";
        } else if (isSelf) {
          name = "You";
        } else {
          name = "Unknown";
        }
      }
      allMessages.push({
        name,
        message: msg.message,
        timestamp: msg.timestamp,
        isSelf: isSelf,
      });
    }
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    setMessages(allMessages);
  }, [
    transcripts,
    chatMessages,
    localParticipant.localParticipant,
    agentAudioTrack.participant,
    agentMessages.segments,
    localMessages.segments,
  ]);

  return (
<ChatTile messages={messages} accentColor={accentColor} onSend={sendChat} allMessage={allMessage} />

  );
}

function segmentToChatMessage(
  s: TranscriptionSegment,
  existingMessage: ChatMessageType | undefined,
  participant: Participant
): ChatMessageType {
  const msg: ChatMessageType = {
    message: s.final ? s.text : `${s.text} ...`,
    name: participant instanceof LocalParticipant ? "You" : "Agent",
    isSelf: participant instanceof LocalParticipant,
    timestamp: existingMessage?.timestamp ?? Date.now(),
  };
  return msg;
}
