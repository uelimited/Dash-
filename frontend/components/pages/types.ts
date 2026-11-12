import type {Dispatch,SetStateAction} from "react";
import type {Project,Row} from "@/lib/project";
import type {TrackerFilters} from "@/lib/tracker";
import type {RegisterSection} from "@/lib/register-schema";
export type View="overview"|"tds"|"procurement"|"costs"|"design"|"monthly"|"site"|"settings"|"sources";
export type PageProps={
  p:Project;
  go:(view:View,trade?:string,status?:string,workStage?:string,budget?:string)=>void;
  openRow:(section:RegisterSection,row?:Row)=>void;
  edit:(kind:string,row:Row)=>void;
  add:(kind:string)=>void;
  registerFilters:TrackerFilters;
  setRegisterFilters:Dispatch<SetStateAction<TrackerFilters>>;
  setDetail:Dispatch<SetStateAction<Row|null>>;
};
export const pagePaths:Record<View,string>={overview:"/",tds:"/tds",procurement:"/procurement",costs:"/costs",design:"/design",monthly:"/monthly",site:"/site",settings:"/project-details",sources:"/source-files"};
