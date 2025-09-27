import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Keyboard,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@todoapp_tasks_v2";
const AUTO_DELETE_SECONDS = 30;

export default function App() {
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const mountedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw));
    };
    load();
    mountedRef.current = true;
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    const total = tasks.length;
    if (total === 0) setMessage("No tienes tareas todavía.");
    else if (total <= 3) setMessage(`Tienes ${total} tarea(s). ¡Buen trabajo!`);
    else if (total <= 5) setMessage(`Tienes ${total} tarea(s). Mantente enfocado.`);
    else setMessage("Demasiadas tareas pendientes");
  }, [tasks]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const threshold = AUTO_DELETE_SECONDS * 1000;
      const newTasks = tasks.filter((t) => {
        if (!t.completed) return true;
        if (t.completedAt && now - t.completedAt >= threshold) return false;
        return true;
      });
      if (newTasks.length !== tasks.length) setTasks(sortTasks(newTasks));
    }, 5000);
    return () => clearInterval(interval);
  }, [tasks]);

  const sortTasks = (arr) => {
    const copy = [...arr];
    copy.sort((a, b) => {
      if (a.completed === b.completed) return b.createdAt - a.createdAt;
      return a.completed ? 1 : -1;
    });
    return copy;
  };

  const addTask = () => {
    const t = text.trim();
    if (!t) {
      Alert.alert("Error", "No puedes agregar una tarea vacía.");
      return;
    }
    if (tasks.some((x) => x.text.toLowerCase() === t.toLowerCase())) {
      Alert.alert("Duplicado", "Esa tarea ya existe.");
      return;
    }
    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      text: t,
      completed: false,
      createdAt: Date.now(),
      completedAt: null,
    };
    setTasks(sortTasks([newTask, ...tasks]));
    setText("");
    Keyboard.dismiss();
  };

  const toggleComplete = (id) => {
    setTasks(
      sortTasks(
        tasks.map((t) =>
          t.id === id
            ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null }
            : t
        )
      )
    );
  };

  const deleteTask = (id) =>
    Alert.alert("Eliminar", "¿Eliminar esta tarea?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => setTasks(tasks.filter((t) => t.id !== id)) },
    ]);

  const clearCompleted = () => {
    const completedCount = tasks.filter((t) => t.completed).length;
    if (!completedCount) {
      Alert.alert("Nada que borrar", "No hay tareas completadas.");
      return;
    }
    Alert.alert("Eliminar completadas", `¿Eliminar ${completedCount} tarea(s) completada(s)?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => setTasks(tasks.filter((t) => !t.completed)) },
    ]);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "pending") return !t.completed;
    if (filter === "completed") return t.completed;
  });

  const renderItem = ({ item }) => {
    const created = new Date(item.createdAt).toLocaleString();
    return (
      <View style={[styles.taskCard, item.completed && styles.taskCardDone]}>
        <TouchableOpacity onPress={() => toggleComplete(item.id)} style={styles.checkCircle}>
          <Text style={{ fontSize: 18 }}>{item.completed ? "✅" : "⬜"}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.taskText, item.completed && styles.taskTextDone]}>{item.text}</Text>
          <Text style={styles.metaText}>Creada: {created}</Text>
          {item.completedAt && (
            <Text style={styles.metaText}>
              Completada: {new Date(item.completedAt).toLocaleTimeString()}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteTask(item.id)}>
          <Text style={{ color: "white", fontSize: 12 }}>🗑</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const messageColor = () => {
    const total = tasks.length;
    if (total === 0) return "#64748b";
    if (total <= 3) return "#22c55e";
    if (total <= 5) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📝 TodoAppPro</Text>

      <View style={styles.inputRow}>
        <TextInput
          placeholder="Escribe una tarea..."
          value={text}
          onChangeText={setText}
          style={styles.input}
          onSubmitEditing={addTask}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addTask}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.messageBox, { backgroundColor: messageColor() }]}>
        <Text style={styles.messageText}>{message}</Text>
      </View>

      <View style={styles.filterRow}>
        {["all", "pending", "completed"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={{ color: filter === f ? "white" : "#334155" }}>
              {f === "all" ? "Todos" : f === "pending" ? "Pendientes" : "Completadas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={{ flex: 1, marginTop: 10 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20, color: "#94a3b8" }}>
            No hay tareas que mostrar.
          </Text>
        }
      />

      <TouchableOpacity style={styles.clearBtn} onPress={clearCompleted}>
        <Text style={{ color: "white", fontWeight: "600" }}>🗑 Borrar completadas</Text>
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        Auto-elimina completadas después de {AUTO_DELETE_SECONDS} segundos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    // 🔥 Ajuste dinámico para notch / barra de estado
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 40,
    paddingBottom: 10,
  },
  header: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 16, color: "#2563eb" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  addBtn: {
    marginLeft: 8,
    backgroundColor: "#2563eb",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  addBtnText: { color: "white", fontSize: 28, fontWeight: "700" },
  messageBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  messageText: { color: "white", fontWeight: "600" },
  filterRow: { flexDirection: "row", justifyContent: "center", marginTop: 12 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: "#e2e8f0",
  },
  filterBtnActive: { backgroundColor: "#2563eb" },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  taskCardDone: { backgroundColor: "#dcfce7" },
  checkCircle: { marginRight: 10 },
  taskText: { fontSize: 16, color: "#1e293b" },
  taskTextDone: { textDecorationLine: "line-through", color: "#64748b" },
  metaText: { fontSize: 12, color: "#475569", marginTop: 2 },
  deleteBtn: { marginLeft: 8, backgroundColor: "#ef4444", borderRadius: 8, padding: 6 },
  clearBtn: { backgroundColor: "#ef4444", padding: 12, borderRadius: 12, alignItems: "center", marginTop: 8 },
  footerNote: { fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 6 },
});
