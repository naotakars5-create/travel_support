import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "@/hooks/useAppState";
import { railNodes } from "@/lib/itinerary";
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
import { MapScreen } from "@/components/MapScreen";
import { GeneratePlanSheet } from "@/components/GeneratePlanSheet";
import { FlashOverlay } from "@/components/FlashOverlay";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/onboarding";

export default function Home() {
  const app = useAppState();
  const [addOpen, setAddOpen] = useState(false);
  // 旅程の空き時間から追加した時に、その日を初期選択にする
  const [addDay, setAddDay] = useState<number | undefined>(undefined);
  const [addLodgingOpen, setAddLodgingOpen] = useState(false);
  const [addRentalOpen, setAddRentalOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const dark = app.tab === "today";
  const editingEntry = editId ? app.entries?.find((e) => e.id === editId) ?? null : null;

  // 初回だけ紹介カードを出す（null = 判定中で、ちらつかせないため何も描かない）
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  useEffect(() => {
    void hasSeenOnboarding().then((seen) => setShowOnboarding(!seen));
  }, []);

  if (!app.entries || showOnboarding === null) {
    return <View className="flex-1 bg-kinari" />;
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onDone={() => {
          void markOnboardingSeen();
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <View className={`flex-1 ${dark ? "bg-day-bg" : "bg-kinari"}`}>
      <StatusBar style={dark ? "light" : "dark"} />

      {/* オフライン表示（地図・AI・住所検索が使えないことを黙らせない） */}
      {!app.isOnline && (
        <View className="bg-ink px-4 py-1.5">
          <Text className="text-center font-gothic-500 text-[10px] text-kinari">
            オフラインです · 地図・AI・住所検索は再接続後に使えます
          </Text>
        </View>
      )}

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
          tripEnded={app.tripEnded}
          tripDate={app.tripDate}
          onSetTripDate={app.setTripDate}
          tripDayCount={app.tripDayCount}
          onSetTripDayCount={app.setTripDayCount}
          baseMode={app.baseMode}
          onSetBaseMode={app.setBaseMode}
          onOpenAdd={() => setAddOpen(true)}
          onOpenAddLodging={() => setAddLodgingOpen(true)}
          onOpenAddRental={() => setAddRentalOpen(true)}
          onGoShiori={() => app.setTab("shiori")}
          onOpenGenerate={() => setGenerateOpen(true)}
          planRequest={app.planRequest}
          onSetPlanRequest={app.setPlanRequest}
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
          entries={app.entries}
          unplaced={app.unplacedEntries}
          currentNodeKey={app.currentNodeKey}
          justAddedEventId={app.justAddedEventId}
          liveLocation={app.liveLocation}
          now={app.now}
          tripDate={app.tripDate}
          tripDayCount={app.tripDayCount}
          readOnly={app.readOnly}
          canUndoCompose={app.canUndoCompose}
          suggestOptimize={app.suggestOptimize}
          composing={app.composing}
          onCompose={app.composeWithAi}
          onUndoCompose={app.undoCompose}
          onNavigatePlan={() => app.setTab("plan")}
          onBumpPriority={(id) => app.updateEntry(id, { priority: "must" })}
          onEditEntry={(id) => setEditId(id)}
          onRemoveEntry={app.removeEntry}
          onMoveEntry={app.moveEntry}
          onSetEntryDay={app.setEntryDay}
          onAddToDay={(day) => {
            setAddDay(day);
            setAddOpen(true);
          }}
        />
      )}
      {app.tab === "today" && (
        <DayOfScreen
          state={app.dayOfState}
          now={app.now}
          nodes={railNodes(app.rail)}
          currentNodeKey={app.currentNodeKey}
          liveLocation={app.liveLocation}
          locationPermission={app.locationPermission}
          onNavigatePlan={() => app.setTab("plan")}
          onRecordArrival={app.recordArrival}
        />
      )}
      {app.tab === "packing" && (
        <PackingScreen
          items={app.packing}
          onToggle={app.togglePacking}
          onAdd={app.addPacking}
          onRemove={app.removePacking}
          onBack={() => app.setTab("profile")}
        />
      )}
      {app.tab === "shiori" && (
        <ShioriScreen
          trips={app.savedTrips}
          canCreate={(app.entries?.length ?? 0) > 0}
          onCreate={app.saveCurrentTrip}
          onNavigatePlan={() => app.setTab("plan")}
          onBack={() => app.setTab("profile")}
          onOpen={(id) => {
            app.loadTrip(id);
          }}
          onDelete={app.deleteTrip}
          onSetCover={app.setTripCover}
          onAddPhotos={app.addTripPhotos}
          onRemovePhoto={app.removeTripPhoto}
        />
      )}
      {app.tab === "map" && (
        <MapScreen
          center={app.areaRefGeo}
          liveLocation={app.liveLocation}
          existingTitles={new Set((app.entries ?? []).map((e) => e.title))}
          onAddSpot={app.addSpot}
          onNavigatePlan={() => app.setTab("plan")}
        />
      )}
      {app.tab === "profile" && (
        <ProfileScreen
          profile={app.profile}
          onEditProfile={() => setProfileOpen(true)}
          onOpenShiori={() => app.setTab("shiori")}
          onOpenPacking={() => app.setTab("packing")}
        />
      )}

      <BottomNav tab={app.tab} onChange={app.setTab} dark={dark} />

      {addOpen && (
        <AddEntrySheet
          tripDate={app.tripDate}
          tripDayCount={app.tripDayCount}
          initialDay={addDay}
          onClose={() => {
            setAddOpen(false);
            setAddDay(undefined);
          }}
          onAdd={(input) => {
            app.addEntry(input);
            setAddOpen(false);
            // 旅程の空き時間から足した時は、そのまま旅程に留まる
            app.setTab(addDay ? "itin" : "plan");
            setAddDay(undefined);
          }}
          onBulkAdd={async (text) => {
            const res = await app.bulkAddFromText(text);
            if (res.ok) app.setTab("plan");
            return res;
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

      {generateOpen && (
        <GeneratePlanSheet
          initialDayCount={app.tripDayCount}
          onClose={() => setGenerateOpen(false)}
          onGenerate={app.generatePlanFromBrief}
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
