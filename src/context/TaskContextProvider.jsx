// src/context/TaskContextProvider.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { TaskContext } from "./TaskContext";

export const TaskContextProvider = ({ children, initialSession }) => {
  // ✅ ESTADO DEL USUARIO
  const [user, setUser] = useState(initialSession?.user || null);
  
  // ✅ REF para controlar si ya se restauró la sesión
  const sessionRestored = useRef(false);
  
  // ✅ LOADING - Inicialización clara
  const [loading, setLoading] = useState(() => {
    if (initialSession?.user) {
      console.log("📌 Usuario inicial desde App.jsx:", initialSession.user.email);
      return false;
    }
    return true;
  });

  // ✅ NUEVO: Estado para saber si la sesión está lista
  const [sessionReady, setSessionReady] = useState(false);
  
  // ✅ ESTADO DE TAREAS NORMALES
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [currentDoneFilter, setCurrentDoneFilter] = useState(false);

  // ✅ ESTADO DE TAREAS PROGRAMADAS
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);

  // ============================================
  // RESTAURAR SESIÓN EN SUPABASE (¡CRÍTICO!)
  // ============================================
  
  const restoreSupabaseSession = useCallback(async () => {
    // ✅ Si ya se restauró, no hacer nada
    if (sessionRestored.current) {
      console.log("✅ Sesión ya restaurada anteriormente");
      return true;
    }

    try {
      // ✅ Intentar obtener sesión de localStorage
      const stored = localStorage.getItem("supabaseSession");
      
      if (!stored) {
        console.log("⚠️ No hay sesión en localStorage");
        return false;
      }

      const parsed = JSON.parse(stored);
      
      // ✅ Extraer tokens correctamente (manejar ambos formatos)
      const accessToken = parsed.session?.access_token || parsed.access_token;
      const refreshToken = parsed.session?.refresh_token || parsed.refresh_token;

      if (!accessToken || !refreshToken) {
        console.error("❌ Tokens incompletos en localStorage");
        localStorage.removeItem("supabaseSession");
        return false;
      }

      console.log("🔄 Restaurando sesión en Supabase...");

      // ✅ RESTAURAR SESIÓN EN SUPABASE
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error("❌ Error restaurando sesión:", error);
        localStorage.removeItem("supabaseSession");
        return false;
      }

      console.log("✅ Sesión restaurada correctamente en Supabase");
      
      // ✅ Actualizar usuario si es necesario
      if (data?.session?.user && !user) {
        setUser(data.session.user);
      }
      
      sessionRestored.current = true;
      setSessionReady(true);
      setLoading(false);
      
      return true;
    } catch (error) {
      console.error("❌ Error restaurando sesión:", error);
      localStorage.removeItem("supabaseSession");
      return false;
    }
  }, [user]);

  // ============================================
  // OBTENER USUARIO
  // ============================================
  const getUser = useCallback(async () => {
    try {
      if (user) {
        console.log("👤 Usuario ya existe en contexto:", user.email);
        setLoading(false);
        setSessionReady(true);
        return user;
      }

      setLoading(true);

      // ✅ PRIMERO: Restaurar sesión de Supabase
      const restored = await restoreSupabaseSession();
      
      if (restored) {
        // ✅ Si se restauró, obtener usuario actualizado
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("❌ Error obteniendo usuario:", error);
          // Intentar con localStorage como fallback
          const stored = localStorage.getItem("supabaseSession");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed?.user) {
                console.log("👤 Usuario desde localStorage:", parsed.user.email);
                setUser(parsed.user);
                setLoading(false);
                setSessionReady(true);
                return parsed.user;
              }
            } catch (parseError) {
              console.error("Error parseando sesión:", parseError);
            }
          }
          setUser(null);
          setLoading(false);
          setSessionReady(false);
          return null;
        }

        if (supabaseUser) {
          console.log("👤 Usuario desde Supabase:", supabaseUser.email);
          setUser(supabaseUser);
          setLoading(false);
          setSessionReady(true);
          return supabaseUser;
        }
      }

      // ✅ Fallback: Intentar obtener sesión directamente
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

      if (error) {
        console.error("❌ Error obteniendo usuario de Supabase:", error);
        setUser(null);
        setLoading(false);
        setSessionReady(false);
        return null;
      }

      if (supabaseUser) {
        console.log("👤 Usuario desde Supabase:", supabaseUser.email);
        setUser(supabaseUser);
        setLoading(false);
        setSessionReady(true);
        return supabaseUser;
      }

      setUser(null);
      setLoading(false);
      setSessionReady(false);
      return null;
    } catch (error) {
      console.error("❌ Error obteniendo usuario:", error);
      setUser(null);
      setLoading(false);
      setSessionReady(false);
      return null;
    }
  }, [user, restoreSupabaseSession]);

  // ============================================
  // CARGAR TAREAS
  // ============================================
  
  const getTasks = useCallback(
    async (done = false) => {
      try {
        // ✅ Si no hay usuario, esperar
        if (!user) {
          console.log("⏳ Esperando usuario para cargar tareas...");
          return;
        }

        // ✅ Verificar que la sesión esté activa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("⏳ Sesión no activa, intentando restaurar...");
          const restored = await restoreSupabaseSession();
          if (!restored) {
            console.log("❌ No se pudo restaurar la sesión");
            return;
          }
        }

        console.log("📋 Cargando tareas para:", user.email);

        const { data, error } = await supabase
          .from("tasks")
          .select()
          .eq("userId", user.id)
          .eq("deleted", false)
          .eq("done", done)
          .order("id", { ascending: false });

        if (error) {
          // ✅ Si el error es de autenticación, intentar restaurar sesión
          if (error.message.includes("AuthSessionMissingError")) {
            console.log("⚠️ Sesión perdida, restaurando...");
            const restored = await restoreSupabaseSession();
            if (restored) {
              // Reintentar una vez
              const retryData = await supabase
                .from("tasks")
                .select()
                .eq("userId", user.id)
                .eq("deleted", false)
                .eq("done", done)
                .order("id", { ascending: false });
              
              if (retryData.error) throw retryData.error;
              setTasks(retryData.data || []);
              console.log(`✅ ${retryData.data?.length || 0} tareas cargadas (reintento)`);
              return;
            }
          }
          throw error;
        }

        console.log(`✅ ${data?.length || 0} tareas cargadas`);
        setTasks(data || []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      }
    },
    [user, restoreSupabaseSession],
  );

  const getDeletedTasks = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        console.error("No user logged in");
        return [];
      }

      const { error, data } = await supabase
        .from("tasks")
        .select()
        .eq("userId", currentUser.id)
        .eq("deleted", true)
        .order("id", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching deleted tasks:", error);
      return [];
    }
  }, []);

  // ============================================
  // EFECTO PRINCIPAL: Inicializar usuario Y cargar tareas
  // ============================================
  
  useEffect(() => {
    const initialize = async () => {
      console.log("🚀 Inicializando contexto...");
      
      // ✅ PASO 1: Si hay initialSession, usarla
      if (initialSession?.user) {
        console.log("📌 Usando initialSession:", initialSession.user.email);
        setUser(initialSession.user);
        
        // ✅ Restaurar sesión en Supabase desde initialSession
        const accessToken = initialSession.session?.access_token || initialSession.access_token;
        const refreshToken = initialSession.session?.refresh_token || initialSession.refresh_token;
        
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          sessionRestored.current = true;
          console.log("✅ Sesión restaurada desde initialSession");
        }
        
        setSessionReady(true);
        setLoading(false);
        
        // ✅ Cargar tareas inmediatamente después de restaurar sesión
        await getTasks(currentDoneFilter);
        return;
      }
      
      // ✅ PASO 2: Intentar restaurar sesión desde localStorage
      const restored = await restoreSupabaseSession();
      
      if (restored) {
        // ✅ Obtener usuario
        await getUser();
        
        // ✅ Cargar tareas
        await getTasks(currentDoneFilter);
      } else {
        setLoading(false);
        setSessionReady(false);
      }
    };
    
    initialize();
  }, [initialSession, getUser, getTasks, currentDoneFilter, restoreSupabaseSession]);

  // ✅ Efecto adicional: Cuando sessionReady cambia, cargar tareas
  useEffect(() => {
    if (sessionReady && user && !loading) {
      console.log("✅ Sesión lista, verificando tareas...");
      getTasks(currentDoneFilter);
    }
  }, [sessionReady, user, loading, getTasks, currentDoneFilter]);

  // ============================================
  // TAREAS NORMALES - Resto del código (sin cambios)
  // ============================================

  const createTask = async (taskName) => {
    if (!taskName.trim()) return;

    setAdding(true);
    try {
      // ✅ Verificar sesión antes de crear tarea
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await restoreSupabaseSession();
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        console.error("No user logged in");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          name: taskName,
          userId: currentUser.id,
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

  const permanentDeleteTask = async (id) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) return;

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("userId", currentUser.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting task permanently:", error);
      throw error;
    }
  };

  const softDeleteTask = async (id) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) return;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted: true })
        .eq("id", id)
        .eq("userId", currentUser.id);

      if (error) throw error;

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error soft deleting task:", error);
      throw error;
    }
  };

  const restoreTask = async (id) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) return;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted: false })
        .eq("id", id)
        .eq("userId", currentUser.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error restoring task:", error);
      throw error;
    }
  };

  const updateTask = async (id, updateFields) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) return;

      const { data, error } = await supabase
        .from("tasks")
        .update(updateFields)
        .eq("id", id)
        .eq("userId", currentUser.id)
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
      setUpdateCounter((prev) => prev + 1);
      await getTasks(currentDoneFilter);
    } catch (error) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, done: currentDone } : task,
        ),
      );
      console.error("Error toggling task:", error);
    }
  };

  // ============================================
  // TAREAS PROGRAMADAS (sin cambios)
  // ============================================

  const getScheduledTasks = useCallback(async () => {
    try {
      setScheduledLoading(true);

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        console.error("No user logged in");
        setScheduledTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from("scheduled_notifications")
        .select("*")
        .eq("user_email", currentUser.email)
        .in("status", ["pending", "sent", "failed", "cancelled"])
        .order("scheduled_for", { ascending: true });

      if (error) throw error;

      setScheduledTasks(data || []);
    } catch (error) {
      console.error("Error fetching scheduled tasks:", error);
      setScheduledTasks([]);
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  const scheduleTaskLater = useCallback(
    async (task, scheduledDate, scheduledTime) => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser || !currentUser.email) {
          throw new Error("No se encontró el email del usuario");
        }

        if (!scheduledDate || !scheduledTime) {
          throw new Error("Debes seleccionar fecha y hora");
        }

        const [year, month, day] = scheduledDate.split("-");
        const [hour, minute] = scheduledTime.split(":");

        const localDateString = `${year}-${month}-${day} ${hour}:${minute}:00`;

        const selectedDate = new Date(year, month - 1, day, hour, minute, 0);
        const now = new Date();

        if (selectedDate < now) {
          throw new Error("No puedes programar una notificación en el pasado");
        }

        const { data, error } = await supabase
          .from("scheduled_notifications")
          .insert({
            task_id: task.id,
            task_name: task.name,
            user_email: currentUser.email,
            scheduled_for: localDateString,
            status: "pending",
          })
          .select()
          .single();

        if (error) throw error;

        setScheduledTasks((prevTasks) => [data, ...prevTasks]);

        return data;
      } catch (error) {
        console.error("Error programando tarea:", error);
        throw error;
      }
    },
    [],
  );

  const rescheduleScheduledTask = useCallback(
    async (id, scheduledDate, scheduledTime) => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser || !currentUser.email) {
          throw new Error("No se encontró el email del usuario");
        }

        if (!scheduledDate || !scheduledTime) {
          throw new Error("Debes seleccionar fecha y hora");
        }

        const [year, month, day] = scheduledDate.split("-");
        const [hour, minute] = scheduledTime.split(":");

        const localDateString = `${year}-${month}-${day} ${hour}:${minute}:00`;

        const selectedDate = new Date(year, month - 1, day, hour, minute, 0);
        const now = new Date();

        if (selectedDate < now) {
          throw new Error("No puedes reprogramar para una fecha pasada");
        }

        const { error } = await supabase
          .from("scheduled_notifications")
          .update({
            scheduled_for: localDateString,
            status: "pending",
            sent_at: null,
          })
          .eq("id", id);

        if (error) throw error;

        await getScheduledTasks();

        return true;
      } catch (error) {
        console.error("Error reprogramando tarea:", error);
        throw error;
      }
    },
    [getScheduledTasks],
  );

  const deleteScheduledTask = useCallback(async (id) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        throw new Error("Usuario no autenticado");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .delete()
        .eq("id", id)
        .eq("user_email", currentUser.email);

      if (error) throw error;

      setScheduledTasks((prevTasks) =>
        prevTasks.filter((task) => task.id !== id),
      );

      return true;
    } catch (error) {
      console.error("Error eliminando tarea:", error);
      throw error;
    }
  }, []);

  const cancelScheduledTask = useCallback(async (id) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        throw new Error("Usuario no autenticado");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("user_email", currentUser.email);

      if (error) throw error;

      setScheduledTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, status: "cancelled" } : task,
        ),
      );

      return true;
    } catch (error) {
      console.error("Error cancelando tarea:", error);
      throw error;
    }
  }, []);

  // ============================================
  // SUSCRIPCIÓN EN TIEMPO REAL
  // ============================================

  useEffect(() => {
    const channel = supabase
      .channel("scheduled_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scheduled_notifications",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new;
            setScheduledTasks((prevTasks) =>
              prevTasks.map((task) =>
                task.id === updatedTask.id ? updatedTask : task,
              ),
            );
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("¡Suscripción a scheduled_notifications ACTIVA!");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error en la suscripción, reintentando...");
          setTimeout(() => {
            channel.subscribe();
          }, 5000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ============================================
  // POLLING DE RESPALDO
  // ============================================

  useEffect(() => {
    const hasPendingTasks = scheduledTasks.some(
      (task) => task.status === "pending",
    );

    if (!hasPendingTasks) return;

    const interval = setInterval(async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) return;

        const { data, error } = await supabase
          .from("scheduled_notifications")
          .select("*")
          .eq("user_email", currentUser.email)
          .in("status", ["pending", "sent", "failed"]);

        if (error) throw error;

        const currentStatuses = scheduledTasks.map((t) => ({
          id: t.id,
          status: t.status,
        }));
        const newStatuses = data.map((t) => ({ id: t.id, status: t.status }));

        const hasChanges =
          JSON.stringify(currentStatuses) !== JSON.stringify(newStatuses);

        if (hasChanges) {
          setScheduledTasks(data);
        }
      } catch (error) {
        console.error("Error en polling:", error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [scheduledTasks]);

  // ============================================
  // VALORES DEL CONTEXTO
  // ============================================

  const value = {
    user,
    loading,
    getUser,
    tasks,
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
    scheduledTasks,
    scheduledLoading,
    getScheduledTasks,
    scheduleTaskLater,
    rescheduleScheduledTask,
    deleteScheduledTask,
    cancelScheduledTask,
    updateCounter,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};