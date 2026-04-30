import { createContext } from "react";

export const TaskContext = createContext();

export const TaskContextProvider = ({ children }) => {
  return (
    <TaskContext.Provider value={{ name: "hola mundo" }}>
      {children}
    </TaskContext.Provider>
  );
};