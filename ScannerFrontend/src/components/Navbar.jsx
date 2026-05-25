import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

function Navbar() {
  return (
    <div className="fixed top-0 left-0 z-50 w-full px-10 py-6">

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/95 px-8 py-4 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-3">

          {/* LOGO */}
          <div className="h-10 w-10 rounded-full bg-white" />

          {/* BRAND NAME */}
          <h1 className="text-2xl font-semibold text-white">
            YourLogo
          </h1>

        </div>

        {/* RIGHT SIDE */}
        <NavigationMenu>

          <NavigationMenuList className="flex items-center gap-8 text-zinc-300">

            <NavigationMenuItem className="cursor-pointer hover:text-white transition-colors">
              Product
            </NavigationMenuItem>

            <NavigationMenuItem className="cursor-pointer hover:text-white transition-colors">
              Resources
            </NavigationMenuItem>

            <NavigationMenuItem className="cursor-pointer hover:text-white transition-colors">
              Customers
            </NavigationMenuItem>

            <NavigationMenuItem className="cursor-pointer hover:text-white transition-colors">
              Pricing
            </NavigationMenuItem>

            <NavigationMenuItem className="cursor-pointer hover:text-white transition-colors">
              Contact
            </NavigationMenuItem>

            {/* Divider */}
            <div className="h-6 w-px bg-white/10" />

            <NavigationMenuItem className="cursor-pointer hover:text-white transition-colors">
              Log in
            </NavigationMenuItem>

            {/* SIGN UP BUTTON */}
            <button className="rounded-full bg-white px-5 py-2 font-medium text-black hover:bg-zinc-200 transition-colors">
              Sign up
            </button>

          </NavigationMenuList>

        </NavigationMenu>

      </div>

    </div>
  );
}

export default Navbar;