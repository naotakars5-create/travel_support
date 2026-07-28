import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppState, TripView } from "@/hooks/useAppState";
import { TripHero } from "./TripHero";
import { PlanScreen } from "./PlanScreen";
import { ItineraryScreen } from "./ItineraryScreen";

/**
 * 「旅」タブ。以前は「計画」と「旅程」の2タブに分かれていたが、
 * 同じデータの2つの見え方でしかなく、どちらで直せばいいのか分からなくなっていた。
 *
 * 見出し（旅の名前・日付・あと何日）は1つにまとめ、中身だけを
 * リスト（行き先を集める）とタイムライン（並んだ形を見る）で切り替える。
 */
export function TripScreen({
  app,
  coverUri,
  onOpenAdd,
  onOpenAddLodging,
  onOpenAddRental,
  onOpenGenerate,
  onEditEntry,
  onAddToDay,
  onOpenTripSettings,
}: {
  app: AppState;
  /** しおりの表紙写真（あれば見出しの背景に敷く） */
  coverUri?: string;
  onOpenAdd: () => void;
  onOpenAddLodging: () => void;
  onOpenAddRental: () => void;
  onOpenGenerate: () => void;
  onEditEntry: (id: string) => void;
  onAddToDay: (day: number) => void;
  onOpenTripSettings: () => void;
}) {
  const insets = useSafeAreaInsets();
  const entries = app.entries ?? [];
  const hasPlan = app.rail.length > 0;

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <TripHero
        title={app.readOnly ? "共有された旅程" : app.tripTitle}
        destination={app.tripDestination}
        tripDate={app.tripDate}
        tripDayCount={app.tripDayCount}
        entryCount={app.totals.entryCount}
        totalCost={app.totals.totalCost}
        now={app.now}
        coverUri={coverUri}
        readOnly={app.readOnly}
        onPressTitle={onOpenTripSettings}
        onShare={app.shareCurrentPlan}
        onAdd={onOpenAdd}
      />

      {/* 見え方の切り替え。行き先が1つも無いうちは意味が無いので出さない */}
      {entries.length > 0 && (
        <View className="flex-row gap-1.5 px-[26px] pb-2">
          <ViewTab label="行き先リスト" active={app.tripView === "list"} onPress={() => app.setTripView("list")} />
          <ViewTab
            label="タイムライン"
            active={app.tripView === "timeline"}
            disabled={!hasPlan}
            onPress={() => app.setTripView("timeline")}
          />
        </View>
      )}
      <View className="h-px w-full bg-highlight/60" />

      {app.tripView === "timeline" && hasPlan ? (
        <ItineraryScreen
          embedded
          planNotes={app.planNotes}
          rail={app.rail}
          entries={entries}
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
          onNavigatePlan={() => app.setTripView("list")}
          onBumpPriority={(id) => app.updateEntry(id, { priority: "must" })}
          onEditEntry={onEditEntry}
          onRemoveEntry={app.removeEntry}
          onMoveEntry={app.moveEntry}
          onSetEntryDay={app.setEntryDay}
          onAddToDay={onAddToDay}
          onAddSpotToDay={(spot, day, stayMin) => app.addSpot(spot, { day, stayMin })}
        />
      ) : (
        <PlanScreen
          embedded
          entries={entries}
          totals={app.totals}
          scheduleByEntry={app.scheduleByEntry}
          suggestions={app.suggestions}
          areaSuggestions={app.areaSuggestions}
          areaSuggestionsLoading={app.areaSuggestionsLoading}
          hasGeoReference={app.hasGeoReference}
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
          onOpenAdd={onOpenAdd}
          onOpenAddLodging={onOpenAddLodging}
          onOpenAddRental={onOpenAddRental}
          onGoShiori={() => app.setTab("shiori")}
          onOpenGenerate={onOpenGenerate}
          planRequest={app.planRequest}
          onSetPlanRequest={app.setPlanRequest}
          onCompose={app.composeWithAi}
          canUndoCompose={app.canUndoCompose}
          onUndoCompose={app.undoCompose}
          onRemoveEntry={app.removeEntry}
          onEditEntry={onEditEntry}
          onSetEntryDay={app.setEntryDay}
          onMoveEntry={app.moveEntry}
          onMoveEntryToEdge={app.moveEntryToEdge}
          onAddSuggestions={app.addSuggestions}
          onShare={app.shareCurrentPlan}
          onImportShared={app.importSharedToOwn}
        />
      )}
    </View>
  );
}

function ViewTab({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled: Boolean(disabled) }}
      className={`rounded-[10px] px-4 py-2 ${active ? "bg-ink" : "border border-ink/20 bg-white/50"} ${
        disabled ? "opacity-35" : ""
      }`}
    >
      <Text className={`font-gothic-700 text-[12px] ${active ? "text-kinari" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}

/** 型の再輸出（TripScreen の外から見え方を指定したい時に使う）。 */
export type { TripView };
