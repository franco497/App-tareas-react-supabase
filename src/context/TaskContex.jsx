import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

  // Usar useCallback para evitar que la función cambie en cada render
  const getTasks = useCallback(async (done = false) => {
    try {
      setLoading(true);
      setCurrentDoneFilter(done);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No user logged in");
        setTasks([]);
        return;
      }

      const { error, data } = await supabase
        .from("tasks")
        .select()
        .eq("userId", user.id)
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
  }, []); // Sin dependencias porque solo usa supabase que es estable

  const createTask = async (taskName) => {
    if (!taskName.trim()) return;
    
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No user logged in");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({ 
          name: taskName, 
          userId: user.id,
          done: false // Asegurar que las nuevas tareas siempre empiezan como pendientes
        })
        .select()
        .single();

      if (error) throw error;

      // Solo agregar la tarea si estamos viendo tareas pendientes
      if (!currentDoneFilter) {
        setTasks((prevTasks) => [data, ...prevTasks]);
      }
      
      // Si estamos viendo tareas completadas, no mostramos la nueva tarea pendiente
      return data;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    } finally {
      setAdding(false);
    }
  };

  const deleteTask = async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("userId", user.id);

      if (error) throw error;

      // Eliminar la tarea del estado local
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  };

  const updateTask = async (id, updateFields) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .update(updateFields)
        .eq("id", id)
        .eq("userId", user.id)
        .select()
        .single();

      if (error) throw error;

      // Actualizar la tarea en el estado local
      setTasks((prevTasks) => 
        prevTasks.map((task) => 
          task.id === id ? { ...task, ...updateFields } : task
        )
      );

      return data;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  // Función para alternar el estado done de una tarea
  const toggleTaskDone = async (id, currentDone) => {
    const newDoneState = !currentDone;
    
    try {
      // Optimistic update - actualizar UI inmediatamente
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, done: newDoneState } : task
        )
      );

      await updateTask(id, { done: newDoneState });
      
      // Opcional: Recargar las tareas si cambiamos de filtro
      // Esto puede ser útil si quieres que las tareas desaparezcan/aparezcan
      // inmediatamente al cambiarlas de estado
      if (currentDoneFilter !== newDoneState) {
        // Si el nuevo estado no coincide con el filtro actual, recargar
        await getTasks(currentDoneFilter);
      }
      
    } catch (error) {
      // Revertir el cambio optimista si hay error
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, done: currentDone } : task
        )
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
    deleteTask,
    updateTask,
    toggleTaskDone, // Exportar la nueva función
    currentDoneFilter,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};