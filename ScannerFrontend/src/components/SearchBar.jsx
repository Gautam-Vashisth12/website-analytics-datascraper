import { Search } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

function SearchBar() {
  return (
    <InputGroup className="max-w-xs bg-white/10 backdrop-blur-xl rounded-xl border border-white/10">
      
      <InputGroupInput
        placeholder="https://yourwebsite.com..."
        className="text-black placeholder:text-zinc-700"
      />

      <InputGroupAddon>
        <Search className="h-4 w-4 text-black" />
      </InputGroupAddon>

    </InputGroup>
  );
}

export default SearchBar;