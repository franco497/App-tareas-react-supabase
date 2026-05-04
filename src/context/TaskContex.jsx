import { createContext, useContext, useEffect, useState } from "react";
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

  const getTasks = async (done = false) => {
    setLoading(true);
    const user = await supabase.auth.getUser();

    const { error, data } = await supabase
      .from("tasks")
      .select()
      .eq("userId", user.data.user.id)
      .order("id", { ascending: true })
      .eq("done", done);
    if (error) throw Error;
    setTasks(data);
    setLoading(false);
  };

  const createTask = async (taskName) => {
    setAdding(true);
    try {
      const user = await supabase.auth.getUser();
      const result = await supabase
        .from("tasks")
        .insert({ name: taskName, userId: user.data.user.id })
        .select();

      if (result.error) throw result.error;

      // Actualiza el estado local con la nueva tarea
      setTasks((prevTasks) => [...prevTasks, result.data[0]]);
    } catch (error) {
      console.error("Error inserting task:", error);
    } finally {
      setAdding(false);
    }
  };

  const deleteTask = async (id) => {
    const user = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("userId", user.data.user.id)
      .eq("id", id)
      .select();
    if (error) throw error;

    setTasks(tasks.filter((task) => task.id !== id));
  };

  return (
    <TaskContext.Provider
      value={{ tasks, getTasks, createTask, adding, loading, deleteTask }}
    >
      {children}
    </TaskContext.Provider>
  );
};
