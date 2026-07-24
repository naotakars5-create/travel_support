import { useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "@/hooks/useAppState";
import { BottomNav } from "@/components/BottomNav";
import { PlanScreen } from "@/components/PlanScreen";
import { ItineraryScreen } from "@/components/ItineraryScreen";
import { DayOfScreen } from "@/components/DayOfScreen";
import { PackingScreen } from "@/components/PackingScreen";
import { AddEntrySheet } from "@/components/AddEntrySheet";
import { EditEntrySheet } from "@/components/EditEntrySheet";
import { FlashOverlay } from "@/components/FlashOverlay";

export default function Home() {
  const app = useAppState();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const dark = app.tab === "today";
  const editingEntry = editId ? app.entries?.find((e) => e.id === editId) ?? null : null;

  if (!app.entries) {
    return <View className="flex-1 bg-kinari" />;
  }

  return (
    <View className={`flex-1 ${dark ? "bg-day-bg" : "bg-kinari"}`}>
      <StatusBar style={dark ? "light" : "dark"} />

      {app.tab === "plan" && (
        <PlanScreen
          entries={app.entries}
          totals={app.totals}
          scheduleByEntry={app.scheduleByEntry}
          suggestions={app.suggestions}
          planNotes={app.planNotes}
          composing={app.composing}
          composeError={app.composeError}
          readOnly={app.readOnly}
          onOpenAdd={() => setAddOpen(true)}
          onCompose={app.composeWithAi}
          onRemoveEntry={app.removeEntry}
          onEditEntry={(id) => setEditId(id)}
          onAddSuggestion={app.addSuggestion}
          onShare={app.shareCurrentPlan}
          onImportShared={app.importSharedToOwn}
        />
      )}
      {app.tab === "itin" && (
        <ItineraryScreen
          rail={app.rail}
          currentNodeKey={app.currentNodeKey}
          justAddedEventId={app.justAddedEventId}
          liveLocation={app.liveLocation}
          onNavigatePlan={() => app.setTab("plan")}
        />
      )}
      {app.tab === "today" && (
        <DayOfScreen
          state={app.dayOfState}
          now={app.now}
          liveLocation={app.liveLocation}
          locationPermission={app.locationPermission}
          onNavigatePlan={() => app.setTab("plan")}
          onRecordArrival={app.recordArrival}
        />
      )}
      {app.tab === "packing" && (
        <PackingScreen items={app.packing} onToggle={app.togglePacking} onAdd={app.addPacking} onRemove={app.removePacking} />
      )}

      <BottomNav tab={app.tab} onChange={app.setTab} dark={dark} />

      {addOpen && (
        <AddEntrySheet
          onClose={() => setAddOpen(false)}
          onAdd={(input) => {
            app.addEntry(input);
            setAddOpen(false);
            app.setTab("plan");
          }}
          onImportMail={app.importFromMail}
        />
      )}

      {editingEntry && (
        <EditEntrySheet
          entry={editingEntry}
          onClose={() => setEditId(null)}
          onSave={(input) => app.editEntry(editingEntry.id, input)}
          onDelete={() => {
            app.removeEntry(editingEntry.id);
            setEditId(null);
          }}
        />
      )}

      <FlashOverlay visible={app.flash.visible} text={app.flash.text} />
    </View>
  );
}
