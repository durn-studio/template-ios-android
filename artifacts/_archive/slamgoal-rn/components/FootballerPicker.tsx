import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FOOTBALLERS, type Footballer } from "@/constants/footballers";

// Footballer picker — horizontal strip of color dots, one per
// roster entry. Tap to select. Selected entry shows a yellow ring +
// the name underneath.
//
// Layout fits inside the game screen's top bar at typical landscape
// phone widths. Disabled while a shot is in flight (caller passes
// `disabled`); locking mid-shot prevents the player from swapping
// out a ball whose physics body was already created.

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function FootballerPicker({ selectedId, onSelect, disabled }: Props) {
  const selected = FOOTBALLERS.find((f) => f.id === selectedId) as
    | Footballer
    | undefined;

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {FOOTBALLERS.map((f) => {
          const isSelected = f.id === selectedId;
          return (
            <Pressable
              key={f.id}
              style={[
                styles.dot,
                {
                  backgroundColor: f.color,
                  borderColor: isSelected ? "#fff" : "rgba(255,255,255,0.2)",
                  borderWidth: isSelected ? 2 : 1,
                  opacity: disabled ? 0.4 : 1,
                },
              ]}
              hitSlop={4}
              disabled={disabled}
              onPress={() => onSelect(f.id)}
            />
          );
        })}
      </View>
      {selected && (
        <Text style={styles.name} numberOfLines={1}>
          {selected.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  name: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
