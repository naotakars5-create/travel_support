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
import { ProfileScreen } from "@/components/ProfileScreen";
import { ProfileSheet } from "@/components/ProfileSheet";
import { ShioriScreen } from "@/components/ShioriScreen";
import { FlashOverlay } from "@/components/FlashOverlay";

export default function Home() {
  const app = useAppState();
  const [addOpen, setAddOpen] = useState(false);
  const [addLodgingOpen, setAddLodgingOpen] = useState(false);
  const [addStartOpen, setAddStartOpen] = useState(false);
  const [addRentalOpen, setAddRentalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
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
          areaSuggestions={app.areaSuggestions}
          areaSuggestionsLoading={app.areaSuggestionsLoading}
          hasGeoReference={app.hasGeoReference}
          planNotes={app.planNotes}
          composing={app.composing}
          composeError={app.composeError}
          readOnly={app.readOnly}
          tripDate={app.tripDate}
          onSetTripDate={app.setTripDate}
          tripDayCount={app.tripDayCount}
          onSetTripDayCount={app.setTripDayCount}
          baseMode={app.baseMode}
          onSetBaseMode={app.setBaseMode}
          profile={app.profile}
          onOpenAdd={() => setAddOpen(true)}
          onOpenAddLodging={() => setAddLodgingOpen(true)}
          onOpenAddStart={() => setAddStartOpen(true)}
          onOpenAddRental={() => setAddRentalOpen(true)}
          onCompose={app.composeWithAi}
          onRemoveEntry={app.removeEntry}
          onEditEntry={(id) => setEditId(id)}
          onSetEntryDay={app.setEntryDay}
          onToggleFixed={app.toggleEntryFixed}
          onMoveEntry={app.moveEntry}
          onMoveEntryToEdge={app.moveEntryToEdge}
          onAddSuggestions={app.addSuggestions}
          onShare={app.shareCurrentPlan}
          onImportShared={app.importSharedToOwn}
        />
      )}
      {app.tab === "itin" && (
        <ItineraryScreen
          rail={app.rail}
          unplaced={app.unplacedEntries}
          currentNodeKey={app.currentNodeKey}
          justAddedEventId={app.justAddedEventId}
          liveLocation={app.liveLocation}
          now={app.now}
          tripDate={app.tripDate}
          onNavigatePlan={() => app.setTab("plan")}
          onBumpPriority={(id) => app.updateEntry(id, { priority: "must" })}
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
      {app.tab === "shiori" && (
        <ShioriScreen
          trips={app.savedTrips}
          canCreate={(app.entries?.length ?? 0) > 0}
          onCreate={app.saveCurrentTrip}
          onOpen={(id) => {
            app.loadTrip(id);
          }}
          onDelete={app.deleteTrip}
          onSetCover={app.setTripCover}
          onAddPhotos={app.addTripPhotos}
          onRemovePhoto={app.removeTripPhoto}
        />
      )}
      {app.tab === "profile" && (
        <ProfileScreen profile={app.profile} onEditProfile={() => setProfileOpen(true)} />
      )}

      <BottomNav tab={app.tab} onChange={app.setTab} dark={dark} />

      {addOpen && (
        <AddEntrySheet
          tripDate={app.tripDate}
          tripDayCount={app.tripDayCount}
          onClose={() => setAddOpen(false)}
          onAdd={(input) => {
            app.addEntry(input);
            setAddOpen(false);
            app.setTab("plan");
          }}
          onImportMail={app.importFromMail}
        />
      )}

      {addLodgingOpen && (
        <AddEntrySheet
          tripDate={app.tripDate}
          tripDayCount={app.tripDayCount}
          fixedMode="stay"
          title="宿泊先を追加"
          onClose={() => setAddLodgingOpen(false)}
          onAdd={(input) => {
            app.addEntry(input);
            setAddLodgingOpen(false);
            app.setTab("plan");
          }}
          onImportMail={app.importFromMail}
        />
      )}

      {addStartOpen && (
        <AddEntrySheet
          tripDate={app.tripDate}
          tripDayCount={app.tripDayCount}
          fixedMode="home"
          title="出発地を設定"
          onClose={() => setAddStartOpen(false)}
          onAdd={(input) => {
            app.addEntry(input);
            setAddStartOpen(false);
            app.setTab("plan");
          }}
          onImportMail={app.importFromMail}
        />
      )}

      {addRentalOpen && (
        <AddEntrySheet
          tripDate={app.tripDate}
          tripDayCount={app.tripDayCount}
          fixedMode="rental"
          title="レンタカーを登録"
          onClose={() => setAddRentalOpen(false)}
          onAdd={(input) => {
            app.addEntry(input);
            setAddRentalOpen(false);
            app.setTab("plan");
          }}
          onImportMail={app.importFromMail}
        />
      )}

      {editingEntry && (
        <EditEntrySheet
          entry={editingEntry}
          tripDate={app.tripDate}
          tripDayCount={app.tripDayCount}
          onClose={() => setEditId(null)}
          onSave={(input) => app.editEntry(editingEntry.id, input)}
          onDelete={() => {
            app.removeEntry(editingEntry.id);
            setEditId(null);
          }}
        />
      )}

      {profileOpen && <ProfileSheet profile={app.profile} onClose={() => setProfileOpen(false)} onSave={app.setProfile} />}

      <FlashOverlay visible={app.flash.visible} text={app.flash.text} />
    </View>
  );
}
