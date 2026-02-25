"use client";

import { useEffect, useRef, useCallback } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import type { Channel } from "pusher-js";

export function usePusherChannel(
  channelName: string | null,
  eventName: string,
  callback: (data: unknown) => void
) {
  const channelRef = useRef<Channel | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!channelName) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind(eventName, (data: unknown) => {
      callbackRef.current(data);
    });

    return () => {
      channel.unbind(eventName);
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [channelName, eventName]);
}

export function usePusherMultiEvent(
  channelName: string | null,
  events: { name: string; handler: (data: unknown) => void }[]
) {
  const handlersRef = useRef(events);
  handlersRef.current = events;

  useEffect(() => {
    if (!channelName) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName);

    for (const event of handlersRef.current) {
      channel.bind(event.name, (data: unknown) => {
        const handler = handlersRef.current.find(
          (e) => e.name === event.name
        )?.handler;
        handler?.(data);
      });
    }

    return () => {
      for (const event of handlersRef.current) {
        channel.unbind(event.name);
      }
      pusher.unsubscribe(channelName);
    };
  }, [channelName]);
}
