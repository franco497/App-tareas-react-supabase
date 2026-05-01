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

  const getTasks = async () => {
    const result = await supabase.from("tasks").select();
    console.log(result);
  };

  return (
    <TaskContext.Provider value={{ tasks, getTasks }}>
      {children}
    </TaskContext.Provider>
  );
};
