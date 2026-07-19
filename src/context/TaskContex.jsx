// src/context/TaskContext.jsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";

export const TaskContext = createContext();

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTask must be used within a TaskContext");
  return context;
};

export const TaskContextProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDoneFilter, setCurrentDoneFilter] = useState(false);

  // Obtener tareas NO borradas (activas)
  const getTasks = useCallback(async (done = false) => {
    try {
      setLoading(true);
      setCurrentDoneFilter(done);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user logged in");
        setTasks([]);
        return;
      }

      const { error, data } = await supabase
        .from("tasks")
        .select()
        .eq("userId", user.id)
        .eq("deleted", false) 
        .eq("done", done)
        .order("id", { ascending: true });

      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener tareas borradas (para la papelera)
  const getDeletedTasks = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user logged in");
        return [];
      }

      const { error, data } = await supabase
        .from("tasks")
        .select()
        .eq("userId", user.id)
        .eq("deleted", true) 
        .order("id", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching deleted tasks:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = async (taskName) => {
    if (!taskName.trim()) return;

    setAdding(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user logged in");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          name: taskName,
          userId: user.id,
          done: false,
          deleted: false, 
        })
        .select()
        .single();

      if (error) throw error;

      if (!currentDoneFilter) {
        setTasks((prevTasks) => [data, ...prevTasks]);
      }

      return data;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    } finally {
      setAdding(false);
    }
  };

  // ❌ Borrado REAL (eliminar de la base de datos)
  const permanentDeleteTask = async (id) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("userId", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting task permanently:", error);
      throw error;
    }
  };

  // 🗑️ Borrado LÓGICO (mover a papelera)
  const softDeleteTask = async (id) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted: true })
        .eq("id", id)
        .eq("userId", user.id);

      if (error) throw error;

      // Eliminar la tarea del estado local (desaparece del dashboard)
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error soft deleting task:", error);
      throw error;
    }
  };

  // ↩️ Restaurar tarea desde papelera
  const restoreTask = async (id) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted: false })
        .eq("id", id)
        .eq("userId", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error restoring task:", error);
      throw error;
    }
  };

  const updateTask = async (id, updateFields) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .update(updateFields)
        .eq("id", id)
        .eq("userId", user.id)
        .select()
        .single();

      if (error) throw error;

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, ...updateFields } : task,
        ),
      );

      return data;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  const toggleTaskDone = async (id, currentDone) => {
    const newDoneState = !currentDone;

    try {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, done: newDoneState } : task,
        ),
      );

      await updateTask(id, { done: newDoneState });

      if (currentDoneFilter !== newDoneState) {
        await getTasks(currentDoneFilter);
      }
    } catch (error) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, done: currentDone } : task,
        ),
      );
      console.error("Error toggling task:", error);
    }
  };

  const value = {
    tasks,
    loading,
    adding,
    getTasks,
    createTask,
    deleteTask: softDeleteTask,
    softDeleteTask,
    permanentDeleteTask,
    restoreTask,
    getDeletedTasks,
    updateTask,
    toggleTaskDone,
    currentDoneFilter,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
