import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "@/hooks/useAppState";
import { railNodes } from "@/lib/itinerary";
import { BottomNav } from "@/components/BottomNav";
import { TripScreen } from "@/components/TripScreen";
import { DayOfScreen } from "@/components/DayOfScreen";
import { PackingScreen } from "@/components/PackingScreen";
import { AddEntrySheet } from "@/components/AddEntrySheet";
import { EditEntrySheet } from "@/components/EditEntrySheet";
import { ProfileScreen } from "@/components/ProfileScreen";
import { ProfileSheet } from "@/components/ProfileSheet";
import { ShioriScreen } from "@/components/ShioriScreen";
import { MapScreen } from "@/components/MapScreen";
import { GeneratePlanSheet } from "@/components/GeneratePlanSheet";
import { TripSwitcherSheet } from "@/components/TripSwitcherSheet";
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
  const [tripSettingsOpen, setTripSettingsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const dark = app.tab === "today";
  const editingEntry = editId ? app.entries?.find((e) => e.id === editId) ?? null : null;

  // 見出しの背景に敷く写真。いま編集中の旅のしおり表紙を使う
  const coverUri = useMemo(() => {
    const trip = app.activeTripId ? app.savedTrips.find((t) => t.id === app.activeTripId) : undefined;
    return trip?.coverPhoto ?? trip?.autoCover?.url;
  }, [app.activeTripId, app.savedTrips]);

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
          <Text className="text-center font-gothic-500 text-[11px] text-kinari">
            オフラインです · 地図・AI・住所検索は再接続後に使えます
          </Text>
        </View>
      )}

      {app.tab === "trip" && (
        <TripScreen
          app={app}
          coverUri={coverUri}
          onOpenAdd={() => setAddOpen(true)}
          onOpenAddLodging={() => setAddLodgingOpen(true)}
          onOpenAddRental={() => setAddRentalOpen(true)}
          onOpenGenerate={() => setGenerateOpen(true)}
          onEditEntry={(id) => setEditId(id)}
          onAddToDay={(day) => {
            setAddDay(day);
            setAddOpen(true);
          }}
          onOpenTripSettings={() => setTripSettingsOpen(true)}
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
          onNavigatePlan={() => app.openTrip("list")}
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
          activeTripId={app.activeTripId}
          canCreate={(app.entries?.length ?? 0) > 0}
          onCreate={app.saveCurrentTrip}
          onNavigatePlan={() => app.openTrip("list")}
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
          readOnly={app.readOnly}
          onAddSpot={app.addSpot}
          onNavigatePlan={() => app.openTrip("list")}
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
            // 旅程の空き時間から足した時は、そのままタイムラインに留まる
            app.openTrip(addDay ? "timeline" : "list");
            setAddDay(undefined);
          }}
          onBulkAdd={async (text) => {
            const res = await app.bulkAddFromText(text);
            if (res.ok) app.openTrip("list");
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
            app.openTrip("list");
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
            app.openTrip("list");
          }}
          onImportMail={app.importFromMail}
        />
      )}

      {generateOpen && (
        <GeneratePlanSheet
          initialDayCount={app.tripDayCount}
          initialDestination={app.tripDestination}
          onClose={() => setGenerateOpen(false)}
          onGenerate={async (brief) => {
            const res = await app.generatePlanFromBrief(brief);
            // 入力した行き先は旅の見出しにも残す（毎回入れ直させない）
            if (res.ok && brief.destination.trim()) app.setTripDestination(brief.destination.trim());
            return res;
          }}
        />
      )}

      {tripSettingsOpen && (
        <TripSwitcherSheet
          trips={app.savedTrips}
          activeTripId={app.activeTripId}
          name={app.tripName}
          destination={app.tripDestination}
          tripDate={app.tripDate}
          tripDayCount={app.tripDayCount}
          onClose={() => setTripSettingsOpen(false)}
          onSetName={app.setTripName}
          onSetDestination={app.setTripDestination}
          onOpenTrip={app.loadTrip}
          onNewTrip={app.startNewTrip}
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
