import React from "react";
import ListManager from "./ListManager";

export default function AdminMessage() {
  return (
    <div className="mt-12">
      <ListManager admin={true} type="message" />
    </div>
  );
}
