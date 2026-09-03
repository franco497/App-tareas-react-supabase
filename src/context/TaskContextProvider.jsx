// src/context/TaskContextProvider.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { TaskContext } from "./TaskContext";

export const TaskContextProvider = ({ children, initialSession }) => {
  // ✅ ESTADO DEL USUARIO
  const [user, setUser] = useState(initialSession?.user || null);
  
  // ✅ REF para control de inicialización
  const initializedRef = useRef(false);
  const tasksLoadedRef = useRef(false);
  
  // ✅ LOADING
  const [loading, setLoading] = useState(true);
  
  // ✅ ESTADO DE TAREAS NORMALES
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [currentDoneFilter, setCurrentDoneFilter] = useState(false);

  // ✅ ESTADO DE TAREAS PROGRAMADAS
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);

  // ============================================
  // CARGAR TAREAS
  // ============================================
  
  const loadTasks = useCallback(async (done = false) => {
    // ✅ Si no hay usuario, salir
    if (!user) {
      console.log("⏳ No hay usuario, no se pueden cargar tareas");
      return;
    }

    try {
      console.log(`📋 Cargando tareas para: ${user.email} (done: ${done})`);

      const { data, error } = await supabase
        .from("tasks")
        .select()
        .eq("userId", user.id)
        .eq("deleted", false)
        .eq("done", done)
        .order("id", { ascending: false });

      if (error) {
        console.error("❌ Error cargando tareas:", error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} tareas cargadas`);
      setTasks(data || []);
      tasksLoadedRef.current = true;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    }
  }, [user]);

  // ============================================
  // VERIFICAR Y RESTAURAR SESIÓN
  // ============================================
  
  const verifyAndRestoreSession = useCallback(async () => {
    try {
      // ✅ 1. Verificar si ya hay sesión en Supabase
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        console.log("✅ Sesión activa en Supabase:", currentSession.user.email);
        if (!user) {
          setUser(currentSession.user);
        }
        return true;
      }

      // ✅ 2. Si no hay sesión, intentar restaurar desde localStorage
      const stored = localStorage.getItem("supabaseSession");
      if (stored) {
        console.log("🔄 Intentando restaurar sesión desde localStorage...");
        const parsed = JSON.parse(stored);
        
        const accessToken = parsed.session?.access_token || parsed.access_token;
        const refreshToken = parsed.session?.refresh_token || parsed.refresh_token;

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data?.session?.user) {
            console.log("✅ Sesión restaurada exitosamente:", data.session.user.email);
            if (!user) {
              setUser(data.session.user);
            }
            return true;
          } else {
            console.error("❌ Error restaurando sesión:", error);
            localStorage.removeItem("supabaseSession");
          }
        }
      }

      return false;
    } catch (error) {
      console.error("❌ Error verificando sesión:", error);
      return false;
    }
  }, [user]);

  // ============================================
  // INICIALIZACIÓN ÚNICA - ¡LA CLAVE!
  // ============================================
  
  useEffect(() => {
    // ✅ Evitar inicialización múltiple
    if (initializedRef.current) {
      console.log("⏳ Contexto ya inicializado, saltando...");
      return;
    }

    const initialize = async () => {
      console.log("🚀 Inicializando contexto...");
      initializedRef.current = true;
      setLoading(true);

      // ✅ CASO 1: Ya tenemos usuario (de initialSession o de localStorage)
      if (user) {
        console.log("📌 Usuario ya presente:", user.email);
        // ✅ Verificar que la sesión esté activa en Supabase
        const sessionActive = await verifyAndRestoreSession();
        if (sessionActive) {
          console.log("✅ Sesión activa, cargando tareas...");
          await loadTasks(currentDoneFilter);
          setLoading(false);
          return;
        }
      }

      // ✅ CASO 2: Tenemos initialSession (viene de App.jsx)
      if (initialSession?.user) {
        console.log("📌 Usando initialSession:", initialSession.user.email);
        setUser(initialSession.user);
        
        // ✅ Restaurar sesión en Supabase desde initialSession
        const accessToken = initialSession.session?.access_token || initialSession.access_token;
        const refreshToken = initialSession.session?.refresh_token || initialSession.refresh_token;
        
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (!error && data?.session?.user) {
            console.log("✅ Sesión restaurada desde initialSession");
            setUser(data.session.user);
            await loadTasks(currentDoneFilter);
            setLoading(false);
            return;
          }
        }
      }

      // ✅ CASO 3: Intentar restaurar desde localStorage
      const restored = await verifyAndRestoreSession();
      if (restored) {
        console.log("✅ Sesión restaurada, cargando tareas...");
        await loadTasks(currentDoneFilter);
      } else {
        console.log("⚠️ No se pudo restaurar la sesión");
      }
      
      setLoading(false);
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ SOLO UNA VEZ

  // ✅ EFECTO PARA ESCUCHAR CAMBIOS EN LA SESIÓN (cuando otra pestaña hace login)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Evento de autenticación en contexto:", event);
      
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          console.log("👤 Usuario autenticado en otra pestaña:", session.user.email);
          
          // ✅ Actualizar usuario
          setUser(session.user);
          localStorage.setItem("supabaseSession", JSON.stringify(session));
          
          // ✅ Cargar tareas automáticamente
          if (!tasksLoadedRef.current) {
            await loadTasks(currentDoneFilter);
          }
          setLoading(false);
        }
      } else if (event === "SIGNED_OUT") {
        console.log("👋 Usuario cerró sesión en otra pestaña");
        setUser(null);
        setTasks([]);
        localStorage.removeItem("supabaseSession");
      }
    });

    return () => subscription.unsubscribe();
  }, [loadTasks, currentDoneFilter]);

  // ============================================
  // TAREAS NORMALES
  // ============================================

  const getTasks = useCallback(async (done = false) => {
    // ✅ Si ya hay tareas cargadas y es el mismo filtro, no recargar
    if (tasksLoadedRef.current && done === currentDoneFilter) {
      console.log("📌 Tareas ya cargadas, usando caché");
      return;
    }
    await loadTasks(done);
  }, [loadTasks, currentDoneFilter]);

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

  const createTask = async (taskName) => {
    if (!taskName.trim()) return;

    setAdding(true);
    try {
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
      await loadTasks(currentDoneFilter);
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
  // TAREAS PROGRAMADAS
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
    getUser: verifyAndRestoreSession,
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