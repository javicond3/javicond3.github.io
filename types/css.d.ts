// Silence TypeScript complaints about CSS side-effect imports
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
