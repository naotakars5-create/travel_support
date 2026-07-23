import { Text, View } from "react-native";
import { FlashFade } from "./animations";

export function FlashOverlay({ visible, text }: { visible: boolean; text: string }) {
  const lines = text.split("\n");
  return (
    <FlashFade visible={visible}>
      <View className="flex-1 items-center justify-center bg-[rgba(28,25,21,.9)] px-8">
        {lines.map((line, i) => (
          <Text key={i} className={`text-center font-mincho-600 text-day-text ${i === 0 ? "text-[13px] text-day-text2" : "mt-3 text-[22px]"}`}>
            {line}
          </Text>
        ))}
      </View>
    </FlashFade>
  );
}
