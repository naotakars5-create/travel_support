import { useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "@/hooks/useAppState";
import { BottomNav } from "@/components/BottomNav";
import { InboxScreen } from "@/components/InboxScreen";
import { ItineraryScreen } from "@/components/ItineraryScreen";
import { DayOfScreen } from "@/components/DayOfScreen";
import { MailSheet } from "@/components/MailSheet";
import { AddMailSheet } from "@/components/AddMailSheet";
import { FlashOverlay } from "@/components/FlashOverlay";

export default function Home() {
  const app = useAppState();
  const [addMailOpen, setAddMailOpen] = useState(false);
  const dark = app.tab === "today";

  if (!app.mails) {
    return <View className="flex-1 bg-kinari" />;
  }

  const selectedMail = app.mails.find((m) => m.id === app.selectedId) ?? null;

  return (
    <View className={`flex-1 ${dark ? "bg-day-bg" : "bg-kinari"}`}>
      <StatusBar style={dark ? "light" : "dark"} />

      {app.tab === "inbox" && <InboxScreen mails={app.mails} onOpen={app.openSheet} onAddMail={() => setAddMailOpen(true)} />}
      {app.tab === "itin" && (
        <ItineraryScreen
          rail={app.rail}
          currentNodeKey={app.currentNodeKey}
          justAddedEventId={app.justAddedEventId}
          onNavigateInbox={() => app.setTab("inbox")}
        />
      )}
      {app.tab === "today" && (
        <DayOfScreen state={app.dayOfState} now={app.now} onNavigateInbox={() => app.setTab("inbox")} onRecordArrival={app.recordArrival} />
      )}

      <BottomNav tab={app.tab} onChange={app.setTab} dark={dark} />

      {app.sheetOpen && selectedMail && (
        <MailSheet
          mail={selectedMail}
          onClose={app.closeSheet}
          onParse={() => app.parseMail(selectedMail)}
          onManualSubmit={(input) => {
            app.addManualEvent(selectedMail.id, input);
            app.closeSheet();
          }}
          onGoToItinerary={(t) => {
            app.setTab(t);
            app.closeSheet();
          }}
        />
      )}

      {addMailOpen && (
        <AddMailSheet
          onClose={() => setAddMailOpen(false)}
          onAdd={(body, source) => {
            const mail = app.addPastedMail(body, source);
            setAddMailOpen(false);
            app.openSheet(mail.id);
          }}
          onAddManual={(input) => {
            const mail = app.addManualMail(input);
            setAddMailOpen(false);
            if (mail) app.openSheet(mail.id);
          }}
        />
      )}

      <FlashOverlay visible={app.flash.visible} text={app.flash.text} />
    </View>
  );
}
